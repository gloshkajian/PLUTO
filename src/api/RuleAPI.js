const fs = require('fs-extra');
const path = require("path");
const stream = require('stream');
const streamToPromise = require('stream-to-promise');
const BaseRuleAPI = require('./BaseRuleAPI');

/*
 * A trivial class which takes a data array and streams it.
 * @private
 */
class _MemoryReaderStream extends stream.Readable {
	/**
	 *
	 * @param data
	 * @private
	 */
	constructor(data) {
		super();
		this.data = Buffer.from(data);
	}

	/**
	 *
	 * @param size
	 * @private
	 */
	_read(size) {
		this.push(this.data);
		this.push(null);
	}
}

/*
 * A trivial class which takes input from a stream and captures it in a buffer.
 * @private
 */
class _MemoryWriterStream extends stream.Writable {
	/**
	 *
	 * @param options
	 * @private
	 */
	constructor(options) {
		super(options);
		this.buffer = Buffer.from(''); // empty
	}

	/**
	 *
	 * @param chunk
	 * @param enc
	 * @param cb
	 * @private
	 */
	_write(chunk, enc, cb) {
		// our memory store stores things in buffers
		const buffer = (Buffer.isBuffer(chunk)) ?
			chunk :  // already is Buffer use it
			new Buffer(chunk, enc);  // string, convert

		// concat to the buffer already there
		this.buffer = Buffer.concat([this.buffer, buffer]);

		// console.log("_MemoryWriterStream DEBUG: " + chunk.toString());

		cb(null);
	}

	/**
	 *
	 * @param encoding
	 * @returns {string}
	 * @private
	 */
	getData(encoding) {
		return this.buffer.toString(encoding);
	}
}

/**
 * This API class is used to describe the interface to rule operations. The methods indicate how the
 * data can be passed to and from the rule. Multiple input and output methods can return true. This allows the
 * application to select the best option for connecting two rules together.
 *
 * Classes derived from this class must implement {@link BaseRuleAPI#run BaseRuleAPI.run()}. The implementation
 * should use the methods in this class to get the input data to the rule and set the output results using the
 * <code>as*()</code> methods. A rule may return a <code>{@link https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise|Promise}
 * </code> and if so must ensure that the <code>resolve()</code>
 * methods returns via one of the <code>as*()</code> methods.
 */
class RuleAPI extends BaseRuleAPI {
	/**
	 * The base constructor. This simply sets <code>this.config</code> to the passed in configuration object. This config object
	 * will be the rule's individual configuration (if any) and additionally contain <code>RootDirectory</code> which defaults to
	 * the application's root directory if not set, <code>TempDirectory</code> which defaults to the application's temporary
	 * directory if not set, <code>OutputEncoding</code> which is set to the rule's Encoding if set or to the ruleset's Encoding
	 * if set, and <code>utf8</code> if none are set, and <code>Encoding</code> which is set to the input file's encoding. (Note
	 * the distinction between <code>Encoding</code> and <code>OutputEncoding</code>. <code>Encoding</code> is set to the source file's encoding and
	 * <code>OutputEncoding</code> is set to the encoding of the file generated by the rule. In general these would be the same
	 * but rule's may want to switch one uncommon encoding for another more common one.)
	 * @param localConfig {object} the rule's configuration as defined in the ruleset file or a standalone config file.
	 */
	constructor(localConfig) {
		super(localConfig);
	}

	/**
	 * Checks whether the rule was initiated with a filename. <code>run()</code> methods would call this so they can
	 * choose to use the filename as opposed to converting the filename into another form such as a stream or data.
	 * @returns {boolean} <code>true</code> if the rule was initialized with a filename and <code>false</code>
	 * otherwise.
	 */
	hasFilename() {
		return this._data && this._data.file;
	}

	/**
	 * Checks whether the rule was initiated with a readable stream. <code>run()</code> methods would call this so they can
	 * choose to use the stream as opposed to converting it into another form such as a file or data.
	 * @returns {boolean} <code>true</code> if the rule was initialized with a stream and <code>false</code>
	 * otherwise.
	 */
	hasStream() {
		return this._data && this._data.stream && this._data.stream instanceof stream.Readable;
	}

	/**
	 * Checks whether the rule was initiated with a data object (unspecified but likely a string). <code>run()</code>
	 * methods would call this so they can
	 * choose to use the object as opposed to converting it into another form such as a file or stream.
	 * @returns {boolean} <code>true</code> if the rule was initialized with a data object and <code>false</code>
	 * otherwise.
	 */
	hasObject() {
		return this._data && this._data.data;
	}

	/**
	 * <code>run()</code> methods call this when they are returning a filename. Generally it would be used as
	 * <pre><code>return asFile(...);</code></pre>.
	 * @param filename the name of the file to return.
	 * @returns an object used by the validator to encapsulate the file return.
	 */
	asFile(filename) {
		return { file : filename };
	}

	/**
	 * <code>run()</code> methods call this when they are returning a data object. Generally it would be used as
	 * <code>return asObject(...);</code>
	 * @param data the data object to return.
	 * @returns an object used by the validator to encapsulate the object return.
	 */
	asObject(data) {
		return { data : data };
	}

	/**
	 * <code>run()</code> methods call this when they are returning a readable stream. Generally it would be used as
	 * <pre><code>return asStream(...);</code></pre>
	 * @param stream the readable stream to return.
	 * @returns an object used by the validator to encapsulate the stream return.
	 */
	asStream(stream) {
		return { stream : stream };
	}

	/**
	 * When a <code>run()</code> method cannot return a valid result is calls this method with a descriptive error message.
	 * Generally it would be used as
	 * <pre><code>return asError(...);</code></pre>
	 * @param message the error message to return.
	 * @returns {Error} an Error object encapsulating the error message.
	 */
	asError(message) {
		return new Error(message);
	}

	/**
	 * A <code>run()</code> implementation calls this when it wants to get the data as an object (usually a String).
	 * If the rule was initialized with a data object that object is returned. If it was initialized with a filename
	 * then the file is first loaded and then the retrieved data is returned. If however the rule was initialized with
	 * a stream a little more work is required. In this case the stream must be read and this is done asynchronously
	 * so a Promise is returned. When the promise is resolved the data will be available. Rules that require an
	 * object should have a <code>run()</code> method that is something like this.
	 * <pre><code>
run() {
	let input = this.object;

	if (input instanceof Promise)
		return input.then((data) => {
			return this._runImpl(data);
		});
	else
		return this._runImpl(input);
}
	 </code></pre>
	 * (where this._runImpl(data) is the actual implementation of the rule taking a data object as an argument.)<br/>
	 * Rules may return Promises. However that promise must resolve() to an actual result. It cannot resolve to another
	 * Promise.
	 * @returns {*}
	 */
	get object() {
		if (this._object)
			return this._object;
		else if (this._objectPromise)
			return this._objectPromise;	// User really shouldn't query this more than once but we also don't want to create multiple Promises.

		if (this.hasFilename())
			this._object = this.config.validator.loadFile(this._data.file, this.config.encoding);
		else if (this.hasStream()) {
			const writer = new _MemoryWriterStream();
			this._data.stream.pipe(writer);	// I'm presuming this is blocking. (The docs don't mention either way.)
			this._object = writer.getData(this.config.encoding);

			this._objectPromise = streamToPromise(writer).then(() => {
				this._objectPromise = undefined;
				this._object = writer.getData(this.config.encoding);
				return this._object;
			});
			return this._objectPromise;
		}
		else
			this._object = this._data.data;

		return this._object;
	}

	/**
	 * A <code>run()</code> implementation calls this when it wants to get the data from a file.
	 * If the rule was initialized with a filename it is returned. If it was initialized with a data object
	 * then that data is first saved to a file and the name of the file is returned. If however the rule was initialized with
	 * a stream a little more work is required. In this case the stream must be written to a file and this is done asynchronously
	 * so a Promise is returned. When the Promise is resolved the file will be available. Rules that require a
	 * file should have a <code>run()</code> method that is something like this.
	 * <pre><code>
run() {
	let input = this.inputFile;

	if (input instanceof Promise)
		return input.then((filename) => {
			return this._runImpl(filename);
		});
	else
		return this._runImpl(input);
}
	 </code></pre>
	 * (where <code>this._runImpl(data)</code> is the actual implementation of the rule taking a filename as an argument.)<br/>
	 * Rules may return Promises. However that promise must resolve() to an actual result. It cannot resolve to another
	 * Promise.
	 * @returns {*}
	 */
	get inputFile() {
		if (this._inputFile)
			return this._inputFile;
		else if (this._inputPromise)
			return this._inputPromise;	// User really shouldn't be doing this but don't want to create a new Promise.

		if (this.hasFilename())
			this._inputFile = this._data.file;
		else if (this.hasStream()) {
			// The last rule output to a stream but the new rule requires the data in a file. So write the
			// stream into a file and when done call the next rule.
			const tempFileName = this.getTempName();
			const writer = fs.createWriteStream(tempFileName);
			this._data.stream.pipe(writer);

			this._inputPromise = streamToPromise(writer).then(() => {
				this._inputPromise = undefined;
				this._inputFile = tempFileName;
				return tempFileName;
			});
			return this._inputPromise;
		}
		else
			this._inputFile = this.saveLocalTempFile(this._data.data, this.config.encoding);

		return this._inputFile;
	}

	/**
	 * This method is used by the application to save the given data to a temporary file synchronously.
	 * @param filename {string} the name of the file to save.
	 * @param fileContents {object | string} the contents of the file.
	 * @param encoding {string} the character encoding for the file. The default is 'utf8'.
	 * @return {string} the name of the temporary file.
	 * @throws Throws an error if the directory cannot be found or the file saved.
	 * @private
	 */
	saveLocalTempFile(fileContents, encoding) {
		const fullname = this.getTempName();
		fs.writeFileSync(fullname, fileContents, encoding);
		return fullname;
	}

	/** Create a unique temporary filename in the temp directory.
	 * @private
	 */
	getTempName() {
		const filename = this.createGUID();
		return path.resolve(this.tempDir, filename);
	}

	createGUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		})
	}

	/**
	 * A <code>run()</code> implementation calls this when it wants to get the data through a stream.
	 * If the rule was initialized with a stream it is returned. If it was initialized with a data object
	 * then that data is written into a stream which is returned. Finally, if the rule was initialized with
	 * a file then a stream is opened up reading the file and that stream is returned. Unlike {@link RuleAPI#object|object}
	 * and {@link RuleAPI#inputFile|inputFile} this property will never return a Promise it will only ever return a readable stream.<br/>
	 * Rules may return Promises. However that promise must resolve() to an actual result. It cannot resolve to another
	 * Promise.
	 * @returns {*}
	 */
	get inputStream() {
		if (this._inputStream)
			return this._inputStream;

		if (this.hasStream())
			this._inputStream = this._data.stream;
		else if (this.hasFilename())
			this._inputStream = fs.createReadStream(this._data.file);
		else
			this._inputStream = new _MemoryReaderStream(this._data.data);

		return this._inputStream;
	}

	/**
	 * This method returns a unique filename in the temporary directory. This guarantees it is cleaned up when
	 * the application exits. Rules can use this method to get a unique name to use when they output to a file.
	 * @returns {String} the absolute path to a unique, temporary file.
	 */
	get outputFile() {
		if (!this._outputFile)
			this._outputFile = this.getTempName();
		return this._outputFile;
	}

	/**
	 * This method returns a writable stream that rules that use streams can use to write into.
	 * @returns {stream.PassThrough} a stream that rules can write into and which can be read by following rules.
	 */
	get outputStream() {
		if (!this._outputStream)
			this._outputStream = new stream.PassThrough();
		return this._outputStream;
	}
}

module.exports = RuleAPI;	// Export this so derived classes can extend it.
