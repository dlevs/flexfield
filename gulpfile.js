'use strict';

//https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md

var watchify   = require('watchify');
var browserify = require('browserify');
var gulp       = require('gulp');
var source     = require('vinyl-source-stream');
var buffer     = require('vinyl-buffer');
var gutil      = require('gulp-util');
var assign     = require('lodash.assign');
var uglify     = require('gulp-uglify');
var rename     = require('gulp-rename');
var insert     = require('gulp-insert');
var fs         = require('fs');

var licence = fs.readFileSync('./src/licence.js', 'utf8');

var paths = {
	entries: ['./src/index.js'],
	dest:    './dist'
};

// add custom browserify options here
var customOpts = {
	entries: paths.entries,
	debug:   true
};

var opts = assign({}, watchify.args, customOpts);
var b    = watchify(browserify(opts));

gulp.task('js', bundle);
b.on('update', bundle); // on any dep update, runs the bundler
b.on('log', gutil.log); // output build logs to terminal

function bundle() {
	return b.bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error')) // log errors if they happen
		.pipe(source('flexfield.js'))
		.pipe(buffer())
		.pipe(insert.prepend(licence))
		.pipe(gulp.dest(paths.dest)) // bundled js file
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
		.pipe(gulp.dest(paths.dest)); // minified js file
}

gulp.task('default', ['js']);