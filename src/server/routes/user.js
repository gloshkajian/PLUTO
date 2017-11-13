const BaseRouter = require('./baseRouter');
const RuleSet = require('../../validator/RuleSet');
const Util = require('../../common/Util');

function getAuth(req) {

	const adminStr = req.header('AUTH-ADMIN');
	const admin = (adminStr && adminStr.length > 0 && adminStr.toLowerCase().startsWith('t')) == true;

	return {
		user: req.header('AUTH-USER'),
		group: req.header('AUTH-GROUP'),
		admin: admin
	}
}

class RulesetRouter extends BaseRouter {
	constructor(config) {
		super(config);
	}

	get(req, res, next) {
		// Note that in general the server and validator can have different root directories.
		// The server's root directory points to the client code while the validator's root
		// directory points to rulesets, rule plugins and such. It can be configured such
		// that these two root directories are the same.

		const auth = getAuth(req);

		if(req.params.id || req.query.id) {

			let id = '';

			if(req.params.id) {
				id = req.params.id;
			} else if(req.query.id) {
				id = req.query.id;
			}

			if(id == 'me') {
				res.json({
					data: {
						type: "user",
						id: id,
						attributes: {
							userid: auth.user,
							group: auth.group,
							admin: auth.admin
						}
					}
				});
			} else {
				res.status(404).send(`Unable to retrieve user '${id}'.`);
			}

		} else {

			res.status(404).send(`Must specify a user id`);

		}
	}
}

module.exports = RulesetRouter;
