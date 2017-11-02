const fs = require('fs');
const path = require('path');

class RuleLoader {

    constructor(customRulePath) {
        this.customRulesPath = customRulePath;

        this.rules = [];
        this.parsers = [];
        this.importers = [];
        this.exporters = [];

        this.rulesMap = {};
        this.parsersMap = {};
        this.importersMap = {};
        this.exportersMap = {};
        this.rulePropertiesMap = {};

        this.classMap = {};

        this.loadManifests();
    }


    loadManifests() {
        let dir = this.customRulesPath;


        this.loadManifest(dir);

        dir = path.resolve(__dirname, '../rules');
        this.loadManifest(dir);

    }

    loadManifest(dir) {

        let manifestFile = dir;
        let manifest = null;

        try {
            manifestFile = path.resolve(dir, 'manifest.json');
            const contents = fs.readFileSync(manifestFile, 'utf8');

            manifest = JSON.parse(contents);

        } catch(e) {
            console.log('Error loading manifest from ' + manifestFile + ': ' + e);
            return;
        }

        let loadItem = (item, type, target, map) => {
            if(!this.classMap[item.filename]) {
                const properties = this.loadFromManifest(dir, item, type);

                if(properties) {
                    target.push(properties);
                    map[item.filename] = this.classMap[item.filename];
                    this.rulePropertiesMap[item.filename] = properties;
                }
            }
        };

        if(manifest.rules) {
            manifest.rules.forEach((item) => {
                loadItem(item, 'rule', this.rules, this.rulesMap);
            });
        }

        if(manifest.parsers) {
            manifest.parsers.forEach((item) => {
                loadItem(item, 'parser', this.parsers, this.parsersMap);
            });
        }

        if(manifest.importers) {
            manifest.importers.forEach((item) => {
                loadItem(item, 'importer', this.importers, this.importersMap);
            });
        }

        if(manifest.exporters) {
            manifest.exporters.forEach((item) => {
                loadItem(item, 'exporter', this.exporters, this.exportersMap);
            });
        }

    }

    loadFromManifest(dir, item, type) {

        let file, suffixedFile, executable;

        try {
        	    executable = item.executable;
            file = item.filename;
            
            suffixedFile = file;
            if (!executable && !suffixedFile.endsWith('.js'))
            		suffixedFile = suffixedFile + '.js';
            
            let ruleFile, script;

            if (executable) {
            	    ruleFile = path.resolve(dir, "RunExternalProcess.js");
            	    if (item.script) {
                    if(item.path) {
                    		script = path.resolve(dir, item.path, item.script);
                    } else {
                    		script = path.resolve(dir, item.script);
                    }
                }
            }
            else if(item.path) {
                ruleFile = path.resolve(dir, item.path, suffixedFile);
            } else {
                ruleFile = path.resolve(dir, suffixedFile);
            }

            var ruleClass = null;

            if (fs.existsSync(ruleFile)) {

                ruleClass = require(ruleFile);

                this.classMap[file] = ruleClass;

                var properties = RuleLoader.getClassProperties(ruleClass);
                
                if (item.ui) {
                    // For executables without scripts their UI must be defined in the manifest.
	            		properties = properties || [];
	            		if (item.ui instanceof Array)
	            			properties = properties.concat(item.ui);
	            		else
	            			properties.append(item.ui);
                }
                
                if (script) {
                    // Scripts, not being JavaScript, need an external UI description file.
                    var moreProperties = RuleLoader.getJSONProperties(script);
                    if (moreProperties) {
                    		properties = properties || [];
                    		if (moreProperties instanceof Array)
                    			properties = properties.concat(moreProperties);
                    		else
                    			properties.append(moreProperties);
                    }
                }
                
                if(properties) {

                    return {
                        id: file,
                        type: type,
                        attributes: {
                            name: file,
                            filename: file,
                            path: item.path,
                            script: script,
                            executable: executable,
                            ui: {
                                properties: properties
                            }
                        }
                    };

                } else {
                    console.log(`${type} ${ruleFile} does not have ConfigProperties.`);
                }
            }
            else
                console.log(`No ${ruleFile} for ${type} ${file}.`);


        } catch (e) {
            console.log(`Error loading ${type} ${file} from manifest in ${dir}: ${e}`);
        }
        return null;
    }

    static getJSONProperties(ruleFile) {
    		// Load ui properties from a companion JSON file. This allows the plug-in developer to add properties without
    		// requiring the manifest maintainer to do anything special when adding the plug-in.
    		let jsonFile = ruleFile + '.json';
    		if (fs.existsSync(jsonFile)) {
    	        try {
    	        		const contents = fs.readFileSync(jsonFile, 'utf8');
    	            return JSON.parse(contents);
    	        } catch(e) {
    	            console.log('Error loading JSON from ' + jsonFile + ': ' + e);
    	            return;
    	        }
    		}
    		return;
    }
    
    static getClassProperties(ruleClass) {

        if(ruleClass.ConfigProperties) {
            //do a deep clone
            let properties = JSON.parse(JSON.stringify(ruleClass.ConfigProperties));

            this.applyDefaults(properties, ruleClass.ConfigDefaults);

            return properties;
        }
        return null;
    }

    static applyDefaults(properties, configDefaults) {

        if(!configDefaults) {
            return;
        }

        properties.forEach((prop) => {
            if (configDefaults.hasOwnProperty(prop.name)) {
                prop.default = configDefaults[prop.name];
            }
        });

        return properties;
    }
}

module.exports = RuleLoader;