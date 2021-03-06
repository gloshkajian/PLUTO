const BaseRouter = require('./baseRouter');
const Util = require('../../common/Util');

const child_process = require('child_process');
const fs = require('fs-extra');
const path = require("path");

const TreeKill = require('tree-kill');
const rimraf = require('rimraf');

const ErrorHandlerAPI = require("../../api/errorHandlerAPI");
const ErrorLogger = require("../../validator/ErrorLogger");



/*
example request
{
    ruleset: "someruleset",
    import: {
        ...
    }
}

 */

class ProcessFileRouter extends BaseRouter {
    constructor(config) {
        super(config);
    }

    post(req, res, next) {
        // Note that in general the server and validator can have different root directories.
        // The server's root directory points to the client code while the validator's root
        // directory points to rulesets, rule plugins and such. It can be configured such
        // that these two root directories are the same.

        console.log('got processFile request');

        let ruleset = null;
        if(req.params.id) {
            ruleset = req.params.id;
        } else if(req.body) {
            ruleset = req.body.ruleset;
        }

        let inputFile;
        let outputFile;
        let importConfig;
        let test;
        let sourceFile;

        if(req.body) {
            inputFile = req.body.input;
            outputFile = req.body.output;
            importConfig = req.body.import;
            test = req.body.test;
            sourceFile = req.body.source_file;
        }

        let prepProcessFile = () => {
            let finishHandler = null;

            if(!ruleset) {
                res.statusMessage = 'Failed to start: no ruleset or source_file specified';
                res.status(422).send('Failed to start: no ruleset or source_file specified');

                return;
            }

            if(test) {
                outputFile = this.getTempName(this.config);

                finishHandler = () => {

                    if (fs.existsSync(outputFile)) {
                        fs.unlink(outputFile);
                    }
                }
            }

            this.generateResponse(res, ruleset,
                this.processFile(ruleset, importConfig, inputFile, outputFile, null,
                    next, res, test, finishHandler));
        };

        if(sourceFile && !ruleset) {
            this.config.data.getRulesets(1, 5, {
                fileExactFilter: sourceFile
            }).then((result) => {
                if(result.rulesets.length == 1) {
                    ruleset = result.rulesets[0].ruleset_id;

                    prepProcessFile();

                } else if(result.rulesets.length > 1) {
                    let msg = `Too many ${sourceFile} matched. Got ${result.rulesets.length}, should only be 1.`;
                    res.statusMessage = msg;
                    res.status(422).send(msg);
                } else {
                    res.statusMessage = `${sourceFile} not found.`;
                    res.status(404).send(`${sourceFile} not found.`);
                }
            }, (error) => {
                next(error);
            }).catch(next);
        } else {

            this.config.data.rulesetExists(ruleset).then((exists) => {

                if(exists) {
                    prepProcessFile();
                } else {
                    res.statusMessage = `${ruleset} not found.`;
                    res.status(404).send(`${ruleset} not found.`);
                }

            }, (error) => {
                next(error);
            }).catch(next);


        }


    }

    processUpload(req, res, next) {
        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        // The name of the input field is used to retrieve the uploaded file
        let file = req.files.file;

        let fileToProcess = this.getTempName(this.config);
        let ruleset = req.body.ruleset;
        let outputFile = this.getTempName(this.config);

        if(!ruleset) {
            res.json({
                processing: 'Failed to start: no rule specified'
            });
            return;
        }

        this.config.data.rulesetExists(ruleset).then((exists) => {

            if(exists) {
                // Use the mv() method to place the file somewhere on your server
                file.mv(fileToProcess, err => {
                    if (err)
                        return res.status(500).send(err);

                    this.generateResponse(res, ruleset,
                        this.processFile(ruleset, null, fileToProcess, outputFile, 'Upload test: ' + file.name, next, res, true, () => {

                            fs.unlink(fileToProcess);

                            if (fs.existsSync(outputFile)) {
                                fs.unlink(outputFile);
                            }
                        })
                    );


                });
            } else {
                res.statusMessage = `${ruleset} not found.`;
                res.status(404).send(`${ruleset} not found.`);
            }

        }, (error) => {
            next(error);
        }).catch(next);

    }

    generateResponse(res, ruleset, processFilePromise) {
        processFilePromise.then((runId) => {
            res.json({
                status: "Started",
                ruleset: ruleset,
                runId: runId
            })
        }, (err) => {
            res.json({
                status: 'Failed to start: ' + err,
                ruleset: ruleset,
                runId: null
            });
        }).catch((e) => {
            res.json({
                status: 'Failed to start: ' + e,
                ruleset: ruleset,
                runId: null
            });
        });
    }

    processFile(ruleset, importConfig, inputFile, outputFile, inputDisplayName, next, res, test, finishedFn) {
        return new Promise((resolve, reject) => {

            var execCmd = 'node validator/startValidator.js -r ' + ruleset + ' -c "' + this.config.validatorConfigPath + '"';
            var spawnCmd = 'node';
            var spawnArgs = ['validator/startValidator.js', '-r', ruleset, '-c', this.config.validatorConfigPath];
            let overrideFile = null;

            if (importConfig) {
                overrideFile = this.getTempName(this.config) + '.json';
                fs.writeFileSync(overrideFile, JSON.stringify({import: importConfig}), 'utf-8');
                execCmd += ' -v "' + overrideFile + '"';
                spawnArgs.push('-v');
                spawnArgs.push(overrideFile);
            } else {
            	if (inputFile) {
                    execCmd += ' -i "' + inputFile + '"';
                    spawnArgs.push('-i');
                    spawnArgs.push(inputFile);
            	}
            	if (outputFile) {
                    execCmd += ' -o "' + outputFile + '"';
                    spawnArgs.push('-o');
                    spawnArgs.push(outputFile);
            	}
                if(inputDisplayName) {
                    execCmd += ' -n "' + inputDisplayName + '"';

                    spawnArgs.push('-n');
                    spawnArgs.push(inputDisplayName);
                }
            }

            if (test) {
                execCmd += ' -t';
                spawnArgs.push('-t');
            }  else {
                execCmd += ' -h';
                spawnArgs.push('-h');
            }

            const options = {
                cwd: path.resolve('.')
            };

            console.log('exec cmd: ' + execCmd);


            let proc = child_process.spawn(spawnCmd, spawnArgs, options);

            let terminated = false;

            function runTimeout() {
                console.log(`Child process for took too long. Terminating.`);
                terminated = true;
                TreeKill(proc.pid);
            }

            const timeoutId = setTimeout(runTimeout, this.config.runMaximumDuration * 1000);
            let runId = null;
            let tempFolder = null;

            const finished = () => {

                clearTimeout(timeoutId);

                this.cleanupRun(runId, tempFolder, terminated);

                if(overrideFile) {
                    fs.unlink(overrideFile);
                }

                if(finishedFn) {
                    finishedFn();
                }
            };

            proc.on('error', (err) => {
                console.log("spawn error: " + err);

                finished();

                reject(err);
            });

            proc.stdout.on('data', (data) => {
                let str = data.toString();
                console.log('stdout: ' + str);

                let strs = str.split('\n');
                for (var i = 0; i < strs.length; i++) {
                    let s = strs[i];
                    if(s.startsWith('runId:')) {
                        runId = s.substr(6).trim();
                        resolve(runId);
                    } else if(s.startsWith('tempFolder:')) {
                        tempFolder = s.substr('tempFolder:'.length).trim();
                    }
                }
            });

            proc.stderr.on('data', (data) => {
                console.log('stderr: ' + data.toString());
            });

            proc.on('exit', (code) => {
                console.log('child process exited with code ' + code.toString());

                finished();

                resolve();
            });



        })
    }

    cleanupRun(runId, tempFolder, wasTerminated) {

        if(runId) {
            this.config.data.getRun(runId).then((runInfo) => {

                if (!runInfo || !runInfo.isrunning)
                {
                    return;
                }

                //this shouldn't exist, but since it does let's clean it up
                const logger = new ErrorLogger();

                if(wasTerminated) {
                    logger.log(ErrorHandlerAPI.ERROR, this.constructor.name, undefined,
                        `Run took too long and was terminated by the server.`);
                } else {
                    logger.log(ErrorHandlerAPI.ERROR, this.constructor.name, undefined,
                        `Run stopped without cleaning up. Server has marked this as finished.`);
                }



                this.config.data.saveRunRecord(runId, logger.getLog(),
                    null, null, null, logger.getCounts(),
                    false, null, null, true)
                    .then(() => { //no-op
                    }, (error) => console.log('error cleaning up bad run: ' + error))
                    .catch((e) => console.log('Exception cleaning up bad run: ' + e))

            }, (error) => {
                console.log(error);
            })
            .catch((error) => {
                console.log(error);
            });
        }

        if(tempFolder && fs.existsSync(tempFolder)) {
            rimraf.sync(tempFolder, null, (e) => {
                console.log('Unable to delete folder: ' + tempFolder + '.  Reason: ' + e);
            });
        }



    }

    // Create a unique temporary filename in the temp directory.
    getTempName(config) {
        const dirname = config.tempDir;
        const filename = Util.createGUID();
        return path.resolve(dirname, filename);
    }
}

module.exports = ProcessFileRouter;
