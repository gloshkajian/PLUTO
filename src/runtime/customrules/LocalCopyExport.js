const fs = require('fs-extra');
const path = require("path");

class LocalCopyExport {
	constructor(config) {
		this.config = config;
	}

	exportFile(sourceFileName, runId, errorLog) {

        return new Promise((resolve, reject) => {

            if(!this.config.file) {
                reject('No target file name.');
                return;
            }

            if(sourceFileName) {
                let targetFileName;

	            if(this.config.base) {
		            targetFileName = path.resolve(this.config.base, this.config.file);
	            } else {
		            targetFileName = path.resolve(this.config.file);
	            }

                fs.copySync(sourceFileName, targetFileName);
				resolve(path.basename(targetFileName));
			} else {
	            resolve(null);
            }
        });
    }

    static get Type() {
        return "exporter";
    }

    static get ConfigProperties() {
        return [
            {
                name: 'file',
                label: 'Destination file path',
                type: 'string',
                tooltip: 'The full path to where the processed file should be placed'
            },
	        {
		        name: 'base',
		        label: 'Destination file base path',
		        type: 'string',
		        tooltip: 'The full path to a base folder where the file should be placed (optional and pre-pended to the file)'
	        }
        ];
    }

};

module.exports = LocalCopyExport;
