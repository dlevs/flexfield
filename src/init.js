'use strict';

var methods = require('./methods');
var util    = require('./util');

var app = {init: init};


/**
 * Start up the FlexField plugin.
 *
 * @param [className=js-flexfield] {String} - The className used by the plugin to target elements.
 */
function init(className) {

	className = className || 'js-flexfield';

	// Remove leading fullstop to allow selector-style string
	if (className[0] === '.') {
		className = className.slice(1);
	}

	// Public methods exposed for user
	app.trigger = methods.resize;
	// app.triggerAll = methods.resizeAll;

	// Init actions
	methods.resizeAll.setSelector(className);

	initEventListeners(className);

	// Initial trigger events for when fields are already populated.
	methods.resizeAll();

	// Can only call init once.
	app.init = function () {
		console.warn('Multiple calls made to flexfield.init function. This can only be called once.');
	};
}


/**
 * Attach events.
 *
 * @param targetClassName {String} - The className used by the plugin to target elements.
 */
function initEventListeners(targetClassName) {

	util.eventListener(document, methods.eventsList(), function (e) {
		methods.resize(e.target, e.type !== 'input');
	}, targetClassName);

	// Resizing the window can cause textareas to grow or shrink. Trigger flexfield.
	util.eventListener(window, ['resize'], methods.resizeAll)

}


// Expose single object
module.exports = app;

