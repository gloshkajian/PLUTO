const fs = require("fs");
const program = require("commander");
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const app = express();

const Validator = require("../validator/validator");
const Router = require("./router");

const Util = require('../common/Util');
const Data = require('../common/dataDb');
const RuleLoader = require('../common/ruleLoader');

const fallback = require('express-history-api-fallback');

let version = "0";
if(fs.existsSync("../../package.json")) {
	version = require("../../../package.json").version;
} else if(fs.existsSync("../package.json")) {
	version = require("../../package.json").version;
}

// The class which uses ExpressJS to serve the Ember client and handle data requests.
class Server {
	constructor(config, validatorConfig, validatorConfigPath) {
		this.config = config;
		this.config.validator = new Validator(validatorConfig, Data);
		this.config.validatorConfigPath = validatorConfigPath;
		this.config.validatorConfig = validatorConfig;

		this.config.data = Data(this.config.validatorConfig);
		this.config.rulesLoader = new RuleLoader(this.config.validator.config.rulesDirectory);

		this.port = this.config.Port || 3000;
		this.rootDir = path.resolve(this.config.rootDirectory || this.config.validator.rootDirectory || ".");
		this.config.tempDir = Util.getRootTempDirectory(validatorConfig, this.rootDir);
		this.router = new Router(config);
		this.assetsDirectory = path.resolve(this.rootDir, this.config.assetsDirectory || "public");


		this.config.runMaximumDuration = this.config.runMaximumDuration || 600;


		app.use(fileUpload());

		// app.use(bodyParser.json()); // for parsing application/json
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
			extended: true
		}));

		// Set up the routing.
		app.use(this.router.router);
		app.use(express.static(this.assetsDirectory));

		app.use(fallback('index.html', { root: this.assetsDirectory }));

		// TODO: Basic error handling. Make it a little less basic?
		if (app.get('env') === 'development') {

			app.use(function(err, req, res, next) {
				console.log(req.url + ': ' + err);
				res.statusMessage = err.message || err;
				res.status(err.status || 500).end();

			});

		}

		// production error handler
		// no stacktraces leaked to user
		app.use(function(err, req, res, next) {
			res.statusMessage = err.message || err;
			res.status(err.status || 500).end();
		});
	}

	/*
	 * Start the server.
	 */
	start() {
		var that = this;
		app.listen(this.port, function () {
			console.log(`Pluto server listening on port ${that.port}!`);
		});
	}
}

let scriptName = process.argv[1];
if (__filename == scriptName) {	// Are we running this as the server or unit test? Only do the following if running as a server.
	program
		.version(version)
		.usage('[options]')
		.description('Serve the validator front end.')
		.option('-s, --serverConfig <configFile>', 'The server configuration file to use.')
		.option('-v, --validatorConfig <configFile>', 'The validator configuration file to use.')
		.parse(process.argv);

	if (!program.serverConfig)
		program.help((text) => {
			return "A server configuration file must be specified.\n" + text;
		});

	let serverConfigPath = path.resolve(program.serverConfig);

	if (!fs.existsSync(serverConfigPath)) {
		console.log("Failed to find server configuration file \"" + program.serverConfig + "\".\n");
		process.exit(1);
	}



	if (!program.validatorConfig)
		program.help((text) => {
			return "A validator configuration file must be specified.\n" + text;
		});

	let validatorConfigPath = path.resolve(program.validatorConfig);

	if (!fs.existsSync(validatorConfigPath)) {
		console.log("Failed to find validator configuration file \"" + program.validatorConfig + "\".\n");
		process.exit(1);
	}

	let serverConfig = require(serverConfigPath);
	let validatorConfig = require(validatorConfigPath);
	validatorConfig.scriptName = scriptName;

	const server = new Server(serverConfig, validatorConfig, validatorConfigPath);
	server.start();
}

module.exports = Server;
