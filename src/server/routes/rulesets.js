const BaseRouter = require('./baseRouter');
const Util = require('../../utilities/Util');

class RulesetRouter extends BaseRouter {
	constructor(config) {
		super(config);
	}

	get(req, res, next) {
		// Note that in general the server and validator can have different root directories.
		// The server's root directory points to the client code while the validator's root
		// directory points to rulesets, rule plugins and such. It can be configured such
		// that these two root directories are the same.
		const ruleset = Util.retrieveRuleset(this.config.validator.config.RulesetDirectory, req.params.id);
		if (!ruleset)
			return next(new Error("Unable to find ruleset."));

		var includedRules = [];
		for (var i = 0; i < ruleset.Rules.length; i++) {
			const rule = ruleset.Rules[i];
			const ruleFilename = rule.FileName;
			const rulename = Util.getRuleName(rule);
			includedRules.push(
				{
					filename: ruleFilename,
					name: rulename
				});
		}

		res.json({
			data: {
				type: "ruleset",
				id: req.params.id,	// The filename is used for the id.
				attributes: {
					name: ruleset.Name,		// The ruleset's name is used here. This will be displayed in the UI.
					"rules-directory": ruleset.RulesDirectory,
					rules : includedRules
				}
			}
		});
	}

	patch(req, res, next) {
		console.log(req.body);
		res.json(req.body);	// Need to reply with what we received to indicate a successful PATCH.
	}
}

module.exports = RulesetRouter;
