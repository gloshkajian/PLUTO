# PLUTO
Primary Layer Updating Tool

## Setup and Building

First, in the PLUTO directory set up the environment by running:

```shell

./setupDevEnvironment.sh
```

To build the docker container:

```shell
npm run build
```

'npm run build' executes the build script, and puts the build into the "./Release" folder.
'npm run docker_build' builds the docker container from this release. Run this before the next
step if you simply want to run the service without developing it. (If you want to develop
jump down to "Starting dev database and running locally" to start a development environment
rather than this release environment.)



## Starting the services

```shell
npm run start_docker
```

It will create a docker volume for the Postgresql database (pgdata), start the database, and then start the web server.

The Postgres database container is listening on port 5432, with user pluto.
The web service container will listen on port 3000, and expects a configuration volume mounted to `/opt/PLUTO/config`.  

The test_config folder at the source root contains a default valid configuration that is mounted to `/opt/PLUTO/config`.
The script will also import the rulesets in `test_config/rulesets` into the database.

It will also start a simple NGINX container to simulate users and authentication, configured from `test_nginx.conf`. 
You can use this by hitting these ports:
  * 8001: no user or group, same as localhost:3000
  * 8002: user="GroupA_user", group="GroupA"
  * 8003: user="GroupB_user", group="GroupB"
  * 8004: user="GroupAdmin_user", group="GroupAdmin", admin=true

## Calling the Service

To process a file, POST to `http://localhost:3000/processfile` with a json package. At a minimum, it must specify a ruleset to execute:

```json
{
	"ruleset": "worldCities"
}
```
And can be call via:

```
curl -d '{"ruleset": "sampleRuleset"}' -H "Content-Type: application/json" -X POST http://localhost:3000/processfile
```

If a custom importer is used as part of the [ruleset][ruleset], import configuration (as defined by the importer) can be supplied as part of the `POST`:

```json
{
	"ruleset": "sampleRuleset",
	"import": {
		"file":"http://someurl.com/somefile.csv",
		"auth":"some authentication"
	}
}
```

## Using the simulated S3

Part of the test suite is a simulated S3 using Scality Zenko Cloudserver (scality/s3server on Docker hub), and the 
S3Importer and S3Exporter can be configured to use it. The default access keys are:

user: accessKey1

password: verySecretKey1

#### Uploading files via Cyberduck 

Unfortunately, the latest versions of Cyberduck removed the ability to connect to non-https S3 like storage systems, so you'll
need to grab an old version:

Windows: https://update.cyberduck.io/windows/Cyberduck-Installer-4.8.4.19355.exe 
Mac: https://update.cyberduck.io/Cyberduck-4.8.4.19355.zip

Once installed double click on `S3 (HTTP).cyberduckprofile` in the root PLUTO folder to setup a connection, and use the keys
above to access it. The Simulated S3 source uses the bucket `test`, and the Simulated S3 target uses `testoutput`.

## Starting dev database and running locally
To run the validator and server locally for dev and debugging purposes, a separate debug database can be started via:

```shell
npm run start_devdb
```
This will start the dev database on port 6543 and import/update the rulesets from the src/runtime/rulesets folder.

There are debug configurations also set up in the src folder. To start the web service locally:

```shell
cd src
node server/server.js -s $PWD/server/debugServerConfig.json -v $PWD/runtime/configs/validatorConfig.json
```

To run the validator manually:

```shell
cd src
node validator/validator.js -r CheckDataRulesetConfig -c $PWD/runtime/configs/validatorConfig.json -v $PWD/runtime/rulesets/override.json"
```

or

```shell
cd src
node validator/validator.js -r CheckDataRulesetConfig -c $PWD/runtime/configs/validatorConfig.json -i examples/data/simplemaps-worldcities-basic.csv -o ../results/simplemaps-worldcities-basic.csv.out
```

## Changing the database schema
We're using node-pg-migrate (https://github.com/salsita/node-pg-migrate) to manage migration.  Migration scripts are 
executed as part of the dev database startup and built as part of the pluto_dbloader container.

Docs on the tools are here: https://github.com/salsita/node-pg-migrate

First, a config file needs to be generated for the tool. To generate one against the dev db:

```shell
cd database/dbloader
node configureDatabase.js -v ../../src/runtime/configs/validatorConfig.json
```

which should create dbconfig.json in that folder. To test out the migration:

```shell
../../node_modules/.bin/pg-migrate up -f dbconfig.json
```

To create a new migration script:

```
../../node_modules/.bin/pg-migrate create your-new-migration
```

which will place the script in the database/dbloader/migrations folder.  Follow the docs on how to create new migrations.

## Building the client for development

first time:
```shell
npm install -g ember-cli
```

to build:
```shell
cd src/client
ember build
```

to monitor and build automatically:
```shell
cd src/client
ember server
```

## Deploying

After the project is built, in the `Release` folder a `deploy` folder is created that contains some basic info in `readme`, 
a sample config folder, a script to start pluto (create and start the db and start the server), and a sample `Dockerfile` 
as an example on how to extend the pluto container to support plugin dependencies.

Details on configuring the deployed system can be found at [Deployed Configuration][deployedReadme]

## More..

Additional information can be found in the following documents.

[Deployed Configuration][deployedReadme]

[Server][server] <span style="color: red">Needs updating</span>

[Validator][validator]

[Ruleset][ruleset]

[Rules][rules]

[deployedReadme]: deployedReadme.md
[server]: docs/server.md
[validator]: docs/validator.md
[ruleset]: docs/ruleset.md
[rules]: docs/rules.md
