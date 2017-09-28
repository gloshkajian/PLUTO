const BaseRouter = require('./baseRouter');
const Util = require('../../common/Util');

class RunsRouter extends BaseRouter {
    constructor(config) {
        super(config);
    }

    get(req, res, next) {
        // Note that in general the server and validator can have different root directories.
        // The server's root directory points to the client code while the validator's root
        // directory points to rulesets, rule plugins and such. It can be configured such
        // that these two root directories are the same.

        if(req.params.id) {
            this.config.data.getRun(req.params.id).then((runInfo) => {
                if (!runInfo)
                {
                    res.status(404).send(`Unable to retrieve the run '${req.params.id}'.`);
                    return;
                }

                res.json({
                    data:  {
                        id: req.params.id,
                        type: 'run',
                        attributes: runInfo
                    }
                });
            }, (error) => {
                next(error);
            })
                .catch(next);

        } else {

            let page = parseInt(req.query.page, 10);
            let size = parseInt(req.query.perPage, 10);
            let rulesetFilter = req.query.rulesetFilter;
            let filenameFilter = req.query.filenameFilter;

            if(isNaN(page)) {
                page = 1;
            }

            if(isNaN(size)) {
                size = 0;
            }

            this.config.data.getRuns(page, size, rulesetFilter, filenameFilter).then((result) => {
              var data = [];

              result.runs.forEach(runInfo => {
                    var run = {
                        id: runInfo.id,
                        type: 'run',
                        attributes: runInfo
                    };
                    data.push(run);
                });



                res.json({
                    data: data,
                    meta: { rowCount: result.rowCount, totalPages: result.pageCount}
                });
            }, next)
                .catch(next);

        }


    }
}

module.exports = RunsRouter;
