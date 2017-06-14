const RuleAPI = require("../runtime/api/RuleAPI");

class RuleExampleUsingStreams extends RuleAPI {
	constructor(config) {
		super(config)
	}

	canUseStreams() {
		return true;
	}

	useStreams(inputStream, outputStream) {
		inputStream.once('readable', () => {
			// Note that this is done as soon as there is data rather than at the end. Otherwise the buffers would fill without any way to drain them.
			this.emit(RuleAPI.NEXT, outputStream);
		});

		// Simply pipe the contents of the input stream to the output stream.
		inputStream.pipe(outputStream);
	}
}

/*
 * Export "instance" so the application can instantiate instances of this class without knowing the name of the class.
 * @type {RuleAPI}
 */
module.exports = RuleExampleUsingStreams;	// Export this so derived classes can extend it.
module.exports.instance = RuleExampleUsingStreams;	// Export this so the application can instantiate the class without knowing it's name.
