'use strict';

//https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md

var watchify     = require('watchify');
var browserify   = require('browserify');
var gulp         = require('gulp');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var gutil        = require('gulp-util');
var assign       = require('lodash.assign');
var uglify       = require('gulp-uglify');
var rename       = require('gulp-rename');
var insert       = require('gulp-insert');
var autoprefixer = require('gulp-autoprefixer');
var minifyCss    = require('gulp-clean-css');
var clean        = require('gulp-clean');
var less         = require('gulp-less');
var fs           = require('fs');
var handlebars   = require('gulp-compile-handlebars');
var path         = require('path');
var prettify     = require('gulp-jsbeautifier');

var licence = fs.readFileSync('./src/app/licence.js', 'utf8');

GLOBAL.rootPath = function (filepath) {
	var args = [__dirname].concat(Array.prototype.slice.call(arguments));
	return path.join.apply(null, args);
};


var paths = {
	app:  {
		js: {
			src:               ['./src/app/index.js'],
			dest:              './dist',
			outputFilename:    'flexfield.js',
			outputFilenameMin: 'flexfield.min.js'
		}
	},
	demo: {
		less: {
			src:   './src/demo/less/style.less',
			dest:  './dist/demo/css',
			watch: './src/demo/less/**/*.less'
		},
		html: {
			template: './src/demo/*.hbs',
			partials: './src/demo/partials',
			data:     ['./src/demo/data/**/*.json'],
			dest:     './dist/demo'
		},
		copy: {
			js:      {
				src:  'src/demo/js/**/*.js',
				dest: './dist/demo/js'
			},
			appFile: {
				src:  './dist/flexfield.min.js',
				dest: './dist/demo/js/vendor'
			}
		}
	}
};

// add custom browserify options here
var opts = assign({}, watchify.args, {
		entries: paths.app.js.src,
		debug:   true
	}),
	b    = watchify(browserify(opts));


function watch() {
	b.on('update', appJsBundle); // on any dep update, runs the bundler
	b.on('log', gutil.log); // output build logs to terminal
	//
	gulp.watch(paths.demo.less.watch, ['demoLess']);
	gulp.watch([paths.demo.html.template, paths.demo.html.data, path.join(paths.demo.html.partials, '**/*.*')], ['demoHtml']);
	gulp.watch(paths.demo.copy.js.src, ['demoCopyJs']);
	gulp.watch(paths.demo.copy.appFile.src, ['demoHtml']);
}

function appJsBundle() {
	return b.bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error')) // log errors if they happen
		.pipe(source(paths.app.js.outputFilename))
		.pipe(buffer())
		.pipe(insert.prepend(licence))
		.pipe(gulp.dest(paths.app.js.dest)) // bundled js file
		.pipe(uglify())
		.pipe(rename(paths.app.js.outputFilenameMin))
		.pipe(gulp.dest(paths.app.js.dest)); // minified js file
}

function demoLess() {
	return gulp.src(paths.demo.less.src)
		.pipe(less({
			paths: [paths.demo.less.watch]
		}))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade:  false
		}))
		// .pipe(minifyCss({compatibility: 'ie8'}))
		// .pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest(paths.demo.less.dest));
}

function demoHtml() {
	var data    = require('./src/demo/data')(paths),
		options = {
			batch: [paths.demo.html.partials]
		};

	return gulp.src(paths.demo.html.template)
		.pipe(handlebars(data, options))
		.pipe(rename({extname: '.html'}))
		.pipe(prettify({indentSize: 4, logSuccess: false}))
		.pipe(gulp.dest(paths.demo.html.dest));
}

function demoCopyJs() {
	return gulp.src(paths.demo.copy.js.src)
		.pipe(gulp.dest(paths.demo.copy.js.dest));
}

function demoCopyAppFile() {
	return gulp.src(paths.demo.copy.appFile.src)
		.pipe(gulp.dest(paths.demo.copy.appFile.dest));
}

function demoClean() {
	return gulp.src('dist/demo/**/*.*', {read: false})
		.pipe(clean());
}

gulp.task('demoLess', demoLess);
gulp.task('demoClean', demoClean);
gulp.task('demoCopyJs', demoCopyJs);
gulp.task('demoCopyAppFile', demoCopyAppFile);
gulp.task('demoHtml', ['demoCopyAppFile'], demoHtml);

gulp.task('buildApp', appJsBundle);
gulp.task('buildDemo', ['demoLess', 'demoHtml', 'demoCopyJs']);

gulp.task('watch', ['buildDemo'], watch);

gulp.task('default', ['demoClean', 'buildApp'], function () {
	gulp.start('watch');
});
