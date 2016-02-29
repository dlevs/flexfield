'use strict';

var fs       = require('fs');
var gzipSize = require('gzip-size');
var round    = require('round');
var path     = require('path');

function getJson(filepath) {
	return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

module.exports = function (paths) {

	var appMinPath  = rootPath(paths.demo.copy.appFile.dest, paths.app.js.outputFilenameMin);
	var appMinFile  = fs.readFileSync(appMinPath, 'utf8');
	var packageJson = getJson(rootPath('package.json'));

	return {
		version:         packageJson.version,
		gzippedFileSize: round((gzipSize.sync(appMinFile) / 1000), 0.1) + 'KB',
		fields:          getJson(path.join(__dirname, 'fields.json')),
		urls: {
			repository: packageJson.repository.url
		}
	}

};