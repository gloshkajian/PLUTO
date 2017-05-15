const path = require("path");

class Util {
	/*
	 * Retrieve a ruleset description.
	 * @param rootDir the directory that may contain the ruleset file.
	 * @param ruleset the name of the ruleset or a ruleset (which is then just returned).
	 * @return an object describing a ruleset.
	 */
	static retrieveRuleset(rootDir, ruleset) {
		if (typeof ruleset === 'string') {
			// Identifying a file to load.
			const rulesetFile = path.resolve(rootDir, ruleset);
			var contents;
			try {
				contents = require(rulesetFile);
			}
			catch (e) {
				throw("Failed to load ruleset file \"" + rulesetFile + "\".\n\t" + e);
			}

			if (!contents.RuleSet) {
				throw("Ruleset file \"" + rulesetFile + "\" does not contains a RuleSet member.");
			}
			ruleset = contents.RuleSet;
		}

		return ruleset;
	}

	/*
	 * Get the name of a rule given a rule description
	 * @param ruleDescriptor the object describing the rule.
	 */
	static getRuleName(ruleDescriptor) {
		return ruleDescriptor.Name || path.basename(ruleDescriptor.FileName);
	}
}

module.exports = Util;
