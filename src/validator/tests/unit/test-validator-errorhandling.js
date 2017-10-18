const ErrorLogger = require("../../ErrorLogger");
const validator = require("../../../validator/validator");
const DataProxy = require("../dbProxy");

const ErrorHandlerAPI = require("../../../api/errorHandlerAPI");

function getDefaultConfig() {
    return {
        "_debugLogger" : new ErrorLogger(),
        "rootDirectory" : "./src",
        "rulesDirectory" : "./validator/tests/testRules",
        "tempDirectory" : "./tmp",
        "inputDirectory" : ".",
        "outputDirectory" : "results"
    };
}

QUnit.test( "Validator Error Handling: No Warnings or Errors", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1
                }
            }
        ],
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        () => {
            assert.equal(vldtr.abort, false, "Expected run to succeed");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: One Error", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    }
                }
            }
        ],
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");
            assert.ok(log.length > 0, "Expected at least one log entry");
            assert.equal(log[0].type, "Error", "Expected an error");
            assert.equal(log[0].description, "Row 2 has error", 'Expected "Row 2 has error"');
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on two errors, only one error", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    }
                }
            }
        ],
        general : { config : {
            "errorsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, false, "Expected run to succeed");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on two errors, has two error", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR,
                        "3": ErrorHandlerAPI.ERROR
                    }
                }
            }
        ],
        general : { config : {
            "errorsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on one warning", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    }
                }
            }
        ],
        general : { config : {
            "warningsToAbort": 1
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on two warnings, have one warning", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    }
                }
            }
        ],
        general : { config : {
            "warningsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, false, "Expected run to succeed");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on two warnings", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING,
                        "3": ErrorHandlerAPI.WARNING
                    }
                }
            }
        ],
        general : { config : {
            "warningsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");

            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.WARNING) == 2, "Expected at 2 warnings");
            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.ERROR) == 2, "Expected two errors (abort & no results)");

        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Abort on rule errors", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    },
                    "errorsToAbort": 1
                }
            }
        ],
        general : { config : {
            "errorsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Pass rule errors, Abort on errors", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    },
                    "errorsToAbort": 2
                }
            },
            {
                filename : "RulePassFail",
                config : {
                    id : 2,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    },
                    "errorsToAbort": 2
                }
            }
        ],
        general : { config : {
            "errorsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");

            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.ERROR) == 4, "Expected four errors");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Pass rule errors, Pass on errors", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    },
                    "errorsToAbort": 2
                }
            },
            {
                filename : "RulePassFail",
                config : {
                    id : 2,
                    rows: {
                        "2": ErrorHandlerAPI.ERROR
                    },
                    "errorsToAbort": 2
                }
            }
        ],
        general : { config : {
            "errorsToAbort": 3
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, false, "Expected run to pass");

            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.ERROR) == 2, "Expected two errors");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Pass rule warnings, Pass on warnings", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    },
                    "warningsToAbort": 2
                }
            },
            {
                filename : "RulePassFail",
                config : {
                    id : 2,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    },
                    "warningsToAbort": 2
                }
            }
        ],
        general : { config : {
            "warningsToAbort": 3
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, false, "Expected run to pass");

            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.WARNING) == 2, "Expected two warnings");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});

QUnit.test( "Validator Error Handling: Pass rule warnings, abort on warnings", function(assert) {
    const config = getDefaultConfig();

    const ruleset = {
        name : "Test Data Ruleset",
        rules : [
            {
                filename : "RulePassFail",
                config : {
                    id : 1,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    },
                    "warningsToAbort": 2
                }
            },
            {
                filename : "RulePassFail",
                config : {
                    id : 2,
                    rows: {
                        "2": ErrorHandlerAPI.WARNING
                    },
                    "warningsToAbort": 2
                }
            }
        ],
        general : { config : {
            "warningsToAbort": 2
        }},
        parser: {
            filename: "CSVParser",
            config: {
                numHeaderRows : 1
            }
        }
    };

    const done = assert.async();

    const dbProxy = new DataProxy(ruleset,
        (runId, log, ruleSetID, inputFile, outputFile) => {
            assert.equal(vldtr.abort, true, "Expected run to fail");

            assert.ok(vldtr.logger.getCount(ErrorHandlerAPI.WARNING) == 2, "Expected two warnings");
        },
        done);


    const vldtr = new validator(config, dbProxy.getDataObj());

    vldtr.runRuleset("src/validator/tests/testDataCSVFile.csv", "output.csv", 'UTF8');

});