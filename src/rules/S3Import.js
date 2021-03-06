const fs = require('fs-extra');
const path = require("path");

const AWS = require('aws-sdk');

class Importer {
	constructor(config) {
		this.config = config;
	}

	importFile(targetFileName) {

        return new Promise((resolve, reject) => {

            if(!targetFileName) {
                reject('No target file name');
            }

            if(!this.config.file) {
                reject('No source file name');
            }


            const s3 = new AWS.S3({
                accessKeyId: this.config.accessId,
                secretAccessKey: this.config.accessKey,
                endpoint: this.config.endpoint,
                sslEnabled: this.config.sslEnabled || false,
                s3ForcePathStyle: this.config.forcePathStyle
            });

            let params = {
                Bucket: this.config.bucket,
                Key: this.config.file
            };

            var file = fs.createWriteStream(targetFileName);

            s3.getObject(params).createReadStream()
                .on('end', () => {
                    resolve(this.config.file);
                })
                .on('error', (error) => {
                    return reject(error); })
                .pipe(file);

        });
    }

    static get Type() {
        return "importer";
    }

    static get ConfigProperties() {
        return [
            {
                name: 'file',
                label: 'File path',
                type: 'string',
                tooltip: 'The path to a file in the bucket'
            },
            {
                name: 'bucket',
                label: 'Bucket name',
                type: 'string',
                tooltip: 'The bucket name',
                hidden: true
            },
            {
                name: 'endpoint',
                label: 'Base URL endpoint (e.g. s3.amazonaws.com)',
                type: 'string',
                tooltip: 'The URL (without protocol), including port if not standard',
                hidden: true
            },
            {
                name: 'sslEnabled',
                label: 'Use secure transfer (SSL/TLS)',
                type: 'boolean',
                tooltip: 'If checked, all communications with the storage will go through encrypted SSL/TLS channel',
                hidden: true
            },
            {
                name: 'forcePathStyle',
                label: 'Force Path Style (S3 compatible systems)',
                type: 'boolean',
                tooltip: 'If checked, forcePathStyle is set to true, used by some S3 compatible systems',
                hidden: true
            },
            {
                name: 'accessId',
                label: 'Access Key ID',
                type: 'string',
                tooltip: '',
                private: true,
                hidden: true
            },
            {
                name: 'accessKey',
                label: 'Secret Access Key',
                type: 'string',
                tooltip: '',
                private: true,
                hidden: true
            }
        ];
    }

}

module.exports = Importer;
