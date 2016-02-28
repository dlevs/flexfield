/**
 * @license
 * Flexfield JavaScript Plugin
 *
 * Copyright (c) 2016, Daniel Levett
 *
 * This project is licensed under the ISC License.
 * See the LICENSE.md file for details.
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// Expose single object
window.flexfield = require('./init');

},{"./init":2}],2:[function(require,module,exports){
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
	try {
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

		util.addClass(document.documentElement, 'flexfield');

	} catch (e) {
		if (window.console) console.warn('This browser does not support the Flexfield plugin.');
	}

	// Can only call init once.
	app.init = function () {
		if (window.console) console.warn('Multiple calls made to flexfield.init function. This can only be called once.');
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


},{"./methods":3,"./util":4}],3:[function(require,module,exports){
'use strict';

var util = require('./util');


/**
 * Get the list of events to listen for depending on the browser.
 *
 * @returns {Array}
 */
function eventsList() {
	if (!eventsList.cache) {
		eventsList.cache = ['input', 'flexfield'];

		// If browser is IE9 (non-standard oninput event), or document has Modernizr class
		// to show lack on oninput event, use alternatives.
		if (util.isIe9() || util.hasClass(document.documentElement, 'no-oninput')) {
			eventsList.cache              = eventsList.cache.concat(['keydown', 'cut', 'paste']);
			eventsList.cache.delayActions = true;
		} else {
			eventsList.cache.delayActions = false;
		}
	}

	return eventsList.cache;
}


/**
 * Compare two heights and return false if no difference, or description of the change.
 *
 * @param oldHeight {Number}
 * @param newHeight {Number}
 * @returns {Boolean, String}
 */
function getHeightChange(oldHeight, newHeight) {
	var change = false;

	oldHeight = parseFloat(oldHeight);
	newHeight = parseFloat(newHeight);

	if (newHeight !== oldHeight) {
		change = newHeight < oldHeight ? 'shrink' : 'grow';
	}

	return change;
}


/**
 * Set the height of an element to match its scrollHeight.
 * If the height has changed, fire an event.
 *
 * @public
 *
 * @param elem {HTMLTextAreaElement}
 * @param [delay=false] {Boolean} - Push action to back of event queue - for events like keydown and paste
 * @returns {boolean}
 */
function resize(elem, delay) {
	// If keydown/ paste events are used instead of an input event, measuring
	// of input scrollHeight needs to be delayed until the text content has changed.
	if (delay) {

		setTimeout(function () {
			resize(elem);
		}, 0);

		return false;
	}

	elem.style.overflowY = 'hidden';

	var style        = window.getComputedStyle(elem, null),
		isNearBottom = util.isTextareaNearBottom(elem, style),
		oldHeight    = style.height,
		change;

	elem.style.height = '';
	elem.style.height = elem.scrollHeight + util.getHeightOffset(style) + 'px';

	change               = getHeightChange(oldHeight, style.height);
	elem.style.overflowY = '';

	if (change) {
		util.emitCustomEvent(elem, 'flexfield.resize', {changeType: change});

		// If first trigger caused vertical scrollbar to be displayed,
		// body width shrinks in some browsers and some inputs may need
		// to be sized again. Re-trigger.
		if (util.bodyWidthChanged()) {
			resizeAll();
		}
	}

	if (isNearBottom) {
		util.scrollToBottom(elem);
	}
}


/**
 * Manually trigger all flexfield inputs to resize.
 *
 * Useful in certain situations, such as on app init,
 * and on window resize, when the size of all elements may change.
 *
 * @public
 */
function resizeAll() {
	// className is set on this function on init call, and used as selector
	var elems        = document.getElementsByClassName(resizeAll.className),
		delayActions = eventsList().delayActions;

	Array.prototype.forEach.call(elems, function (elem) {
		resize(elem, delayActions);
	});

	// If first trigger caused vertical scrollbar to be displayed,
	// body width shrinks in some browsers and some inputs may need
	// to be sized again. Re-trigger.
	if (util.bodyWidthChanged()) {
		resizeAll();
	}
}


/**
 * Set the classname that should be used by the resizeAll function.
 *
 * @param className {String}
 */
resizeAll.setSelector = function (className) {
	resizeAll.className = className;
};


module.exports = {
	eventsList: eventsList,
	resize:     resize,
	resizeAll:  resizeAll
};

},{"./util":4}],4:[function(require,module,exports){
'use strict';

/**
 * Emit a custom event.
 *
 * @param elem {Element}
 * @param eventName {String}
 * @param detail {Object}
 */
function emitCustomEvent(elem, eventName, detail) {
	var event,
		options = {bubbles: true, cancelable: true, detail: detail};

	if (window.CustomEvent) {
		if (detail) options.detail = detail;
		event = new CustomEvent(eventName, options);
	} else {
		// IE
		event = document.createEvent('CustomEvent');
		event.initCustomEvent(eventName, options.bubbles, options.cancelable, options.detail);
	}

	elem.dispatchEvent(event);
}


/**
 * Apply an event listener to an element.
 * Pass optional delegateClass parameter to delegate the event.
 *
 * @param elem {Element, Document, Window}
 * @param events {Array}
 * @param cb {Function}
 * @param [delegateClass] {String}
 */
function eventListener(elem, events, cb, delegateClass) {

	var func = cb;

	// If defined, execute function only when target has delegate class
	if (typeof delegateClass === 'string') {
		func = function (e) {
			if (hasClass(e.target, delegateClass)) {
				cb.call(e.target, e);
			}
		}
	}

	events.forEach(function (event) {
		elem.addEventListener(event, func, false);
	});

}


/**
 * Check that an element has a class.
 * Based on jQuery 1.12.0 hasClass implementation
 *
 * @param elem {Element}
 * @param className {String}
 * @returns {Boolean}
 */
function hasClass(elem, className) {
	className = ' ' + className + ' ';
	return (' ' + elem.className + ' ').replace(/[\t\r\n\f]/g, ' ').indexOf(className) !== -1;
}


/**
 * Add a class to an element
 *
 * @param elem {Element}
 * @param className {String}
 * @returns {String} - Element's new, full className
 */
function addClass(elem, className) {
	if (elem.className) {
		className = ' ' + className;
	}

	return elem.className += className;
}


/**
 * Has the body element width changed since the last time this function was called?
 *
 * @returns {Boolean}
 */
function bodyWidthChanged() {
	var width      = document.body.clientWidth,
		hasChanged = width !== bodyWidthChanged.lastWidth;

	bodyWidthChanged.lastWidth = width;

	return hasChanged;
}
bodyWidthChanged.lastWidth = document.body.clientWidth;


/**
 * Is the browser Internet Explorer 9?
 * IE9 is a special case as it has the oninput event, but it behaves differently to
 * modern browser implementations.
 *
 * @returns {Boolean}
 */
function isIe9() {
	return navigator.userAgent.indexOf('MSIE 9') !== -1;
}


/**
 * Sums a list of numeric values.
 * @param {...(Number|String)}
 * @returns {Number}
 */
function sumFloats() {
	return Array.prototype.reduce.call(arguments, function (prev, current) {
		return prev + parseFloat(current);
	}, 0)
}


/**
 * Scroll to the bottom of an element.
 *
 * @param elem {Element}
 * @returns {Element}
 */
function scrollToBottom(elem) {
	elem.scrollTop = elem.scrollHeight;
	return elem;
}


/**
 * Is the inner scroll of the textareas close to the bottom?
 * Takes into account cursor position.
 *
 * @param elem {HTMLTextAreaElement}
 * @param [style] {CSSStyleDeclaration}
 * @returns {Boolean}
 */
function isTextareaNearBottom(elem, style) {

	style = style || window.getComputedStyle(elem, null);

	var isScrolledNearBottom = elem.scrollTop + elem.clientHeight > elem.scrollHeight - (parseFloat(style.lineHeight) * 2),
		isTypingNearBottom   = elem.selectionStart > elem.value.length - 40;

	return isScrolledNearBottom && isTypingNearBottom;
}


/**
 * Setting an element's height in CSS is complicated by the fact that
 * different height values need to be applied depending on the element's
 * box-sizing value. Calculate the offset needed.
 *
 * @param computedStyle {CSSStyleDeclaration}
 * @returns {Number}
 */
function getHeightOffset(computedStyle) {
	if (computedStyle.boxSizing === 'border-box') {
		return sumFloats(computedStyle.borderTopWidth, computedStyle.borderBottomWidth);
	} else {
		return -sumFloats(computedStyle.paddingTop, computedStyle.paddingBottom);
	}
}


module.exports = {
	emitCustomEvent:      emitCustomEvent,
	eventListener:        eventListener,
	bodyWidthChanged:     bodyWidthChanged,
	hasClass:             hasClass,
	addClass:             addClass,
	isIe9:                isIe9,
	isTextareaNearBottom: isTextareaNearBottom,
	scrollToBottom:       scrollToBottom,
	getHeightOffset:      getHeightOffset
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvaW5pdC5qcyIsInNyYy9tZXRob2RzLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBFeHBvc2Ugc2luZ2xlIG9iamVjdFxud2luZG93LmZsZXhmaWVsZCA9IHJlcXVpcmUoJy4vaW5pdCcpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWV0aG9kcyA9IHJlcXVpcmUoJy4vbWV0aG9kcycpO1xudmFyIHV0aWwgICAgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGFwcCA9IHtpbml0OiBpbml0fTtcblxuXG4vKipcbiAqIFN0YXJ0IHVwIHRoZSBGbGV4RmllbGQgcGx1Z2luLlxuICpcbiAqIEBwYXJhbSBbY2xhc3NOYW1lPWpzLWZsZXhmaWVsZF0ge1N0cmluZ30gLSBUaGUgY2xhc3NOYW1lIHVzZWQgYnkgdGhlIHBsdWdpbiB0byB0YXJnZXQgZWxlbWVudHMuXG4gKi9cbmZ1bmN0aW9uIGluaXQoY2xhc3NOYW1lKSB7XG5cdHRyeSB7XG5cdFx0Y2xhc3NOYW1lID0gY2xhc3NOYW1lIHx8ICdqcy1mbGV4ZmllbGQnO1xuXG5cdFx0Ly8gUmVtb3ZlIGxlYWRpbmcgZnVsbHN0b3AgdG8gYWxsb3cgc2VsZWN0b3Itc3R5bGUgc3RyaW5nXG5cdFx0aWYgKGNsYXNzTmFtZVswXSA9PT0gJy4nKSB7XG5cdFx0XHRjbGFzc05hbWUgPSBjbGFzc05hbWUuc2xpY2UoMSk7XG5cdFx0fVxuXG5cdFx0Ly8gUHVibGljIG1ldGhvZHMgZXhwb3NlZCBmb3IgdXNlclxuXHRcdGFwcC50cmlnZ2VyID0gbWV0aG9kcy5yZXNpemU7XG5cdFx0Ly8gYXBwLnRyaWdnZXJBbGwgPSBtZXRob2RzLnJlc2l6ZUFsbDtcblxuXHRcdC8vIEluaXQgYWN0aW9uc1xuXHRcdG1ldGhvZHMucmVzaXplQWxsLnNldFNlbGVjdG9yKGNsYXNzTmFtZSk7XG5cblx0XHRpbml0RXZlbnRMaXN0ZW5lcnMoY2xhc3NOYW1lKTtcblxuXHRcdC8vIEluaXRpYWwgdHJpZ2dlciBldmVudHMgZm9yIHdoZW4gZmllbGRzIGFyZSBhbHJlYWR5IHBvcHVsYXRlZC5cblx0XHRtZXRob2RzLnJlc2l6ZUFsbCgpO1xuXG5cdFx0dXRpbC5hZGRDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdmbGV4ZmllbGQnKTtcblxuXHR9IGNhdGNoIChlKSB7XG5cdFx0aWYgKHdpbmRvdy5jb25zb2xlKSBjb25zb2xlLndhcm4oJ1RoaXMgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHRoZSBGbGV4ZmllbGQgcGx1Z2luLicpO1xuXHR9XG5cblx0Ly8gQ2FuIG9ubHkgY2FsbCBpbml0IG9uY2UuXG5cdGFwcC5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS53YXJuKCdNdWx0aXBsZSBjYWxscyBtYWRlIHRvIGZsZXhmaWVsZC5pbml0IGZ1bmN0aW9uLiBUaGlzIGNhbiBvbmx5IGJlIGNhbGxlZCBvbmNlLicpO1xuXHR9O1xufVxuXG5cbi8qKlxuICogQXR0YWNoIGV2ZW50cy5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0Q2xhc3NOYW1lIHtTdHJpbmd9IC0gVGhlIGNsYXNzTmFtZSB1c2VkIGJ5IHRoZSBwbHVnaW4gdG8gdGFyZ2V0IGVsZW1lbnRzLlxuICovXG5mdW5jdGlvbiBpbml0RXZlbnRMaXN0ZW5lcnModGFyZ2V0Q2xhc3NOYW1lKSB7XG5cblx0dXRpbC5ldmVudExpc3RlbmVyKGRvY3VtZW50LCBtZXRob2RzLmV2ZW50c0xpc3QoKSwgZnVuY3Rpb24gKGUpIHtcblx0XHRtZXRob2RzLnJlc2l6ZShlLnRhcmdldCwgZS50eXBlICE9PSAnaW5wdXQnKTtcblx0fSwgdGFyZ2V0Q2xhc3NOYW1lKTtcblxuXHQvLyBSZXNpemluZyB0aGUgd2luZG93IGNhbiBjYXVzZSB0ZXh0YXJlYXMgdG8gZ3JvdyBvciBzaHJpbmsuIFRyaWdnZXIgZmxleGZpZWxkLlxuXHR1dGlsLmV2ZW50TGlzdGVuZXIod2luZG93LCBbJ3Jlc2l6ZSddLCBtZXRob2RzLnJlc2l6ZUFsbClcblxufVxuXG5cbi8vIEV4cG9zZSBzaW5nbGUgb2JqZWN0XG5tb2R1bGUuZXhwb3J0cyA9IGFwcDtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbi8qKlxuICogR2V0IHRoZSBsaXN0IG9mIGV2ZW50cyB0byBsaXN0ZW4gZm9yIGRlcGVuZGluZyBvbiB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIGV2ZW50c0xpc3QoKSB7XG5cdGlmICghZXZlbnRzTGlzdC5jYWNoZSkge1xuXHRcdGV2ZW50c0xpc3QuY2FjaGUgPSBbJ2lucHV0JywgJ2ZsZXhmaWVsZCddO1xuXG5cdFx0Ly8gSWYgYnJvd3NlciBpcyBJRTkgKG5vbi1zdGFuZGFyZCBvbmlucHV0IGV2ZW50KSwgb3IgZG9jdW1lbnQgaGFzIE1vZGVybml6ciBjbGFzc1xuXHRcdC8vIHRvIHNob3cgbGFjayBvbiBvbmlucHV0IGV2ZW50LCB1c2UgYWx0ZXJuYXRpdmVzLlxuXHRcdGlmICh1dGlsLmlzSWU5KCkgfHwgdXRpbC5oYXNDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICduby1vbmlucHV0JykpIHtcblx0XHRcdGV2ZW50c0xpc3QuY2FjaGUgICAgICAgICAgICAgID0gZXZlbnRzTGlzdC5jYWNoZS5jb25jYXQoWydrZXlkb3duJywgJ2N1dCcsICdwYXN0ZSddKTtcblx0XHRcdGV2ZW50c0xpc3QuY2FjaGUuZGVsYXlBY3Rpb25zID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXZlbnRzTGlzdC5jYWNoZS5kZWxheUFjdGlvbnMgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzTGlzdC5jYWNoZTtcbn1cblxuXG4vKipcbiAqIENvbXBhcmUgdHdvIGhlaWdodHMgYW5kIHJldHVybiBmYWxzZSBpZiBubyBkaWZmZXJlbmNlLCBvciBkZXNjcmlwdGlvbiBvZiB0aGUgY2hhbmdlLlxuICpcbiAqIEBwYXJhbSBvbGRIZWlnaHQge051bWJlcn1cbiAqIEBwYXJhbSBuZXdIZWlnaHQge051bWJlcn1cbiAqIEByZXR1cm5zIHtCb29sZWFuLCBTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdldEhlaWdodENoYW5nZShvbGRIZWlnaHQsIG5ld0hlaWdodCkge1xuXHR2YXIgY2hhbmdlID0gZmFsc2U7XG5cblx0b2xkSGVpZ2h0ID0gcGFyc2VGbG9hdChvbGRIZWlnaHQpO1xuXHRuZXdIZWlnaHQgPSBwYXJzZUZsb2F0KG5ld0hlaWdodCk7XG5cblx0aWYgKG5ld0hlaWdodCAhPT0gb2xkSGVpZ2h0KSB7XG5cdFx0Y2hhbmdlID0gbmV3SGVpZ2h0IDwgb2xkSGVpZ2h0ID8gJ3NocmluaycgOiAnZ3Jvdyc7XG5cdH1cblxuXHRyZXR1cm4gY2hhbmdlO1xufVxuXG5cbi8qKlxuICogU2V0IHRoZSBoZWlnaHQgb2YgYW4gZWxlbWVudCB0byBtYXRjaCBpdHMgc2Nyb2xsSGVpZ2h0LlxuICogSWYgdGhlIGhlaWdodCBoYXMgY2hhbmdlZCwgZmlyZSBhbiBldmVudC5cbiAqXG4gKiBAcHVibGljXG4gKlxuICogQHBhcmFtIGVsZW0ge0hUTUxUZXh0QXJlYUVsZW1lbnR9XG4gKiBAcGFyYW0gW2RlbGF5PWZhbHNlXSB7Qm9vbGVhbn0gLSBQdXNoIGFjdGlvbiB0byBiYWNrIG9mIGV2ZW50IHF1ZXVlIC0gZm9yIGV2ZW50cyBsaWtlIGtleWRvd24gYW5kIHBhc3RlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gcmVzaXplKGVsZW0sIGRlbGF5KSB7XG5cdC8vIElmIGtleWRvd24vIHBhc3RlIGV2ZW50cyBhcmUgdXNlZCBpbnN0ZWFkIG9mIGFuIGlucHV0IGV2ZW50LCBtZWFzdXJpbmdcblx0Ly8gb2YgaW5wdXQgc2Nyb2xsSGVpZ2h0IG5lZWRzIHRvIGJlIGRlbGF5ZWQgdW50aWwgdGhlIHRleHQgY29udGVudCBoYXMgY2hhbmdlZC5cblx0aWYgKGRlbGF5KSB7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHJlc2l6ZShlbGVtKTtcblx0XHR9LCAwKTtcblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGVsZW0uc3R5bGUub3ZlcmZsb3dZID0gJ2hpZGRlbic7XG5cblx0dmFyIHN0eWxlICAgICAgICA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0sIG51bGwpLFxuXHRcdGlzTmVhckJvdHRvbSA9IHV0aWwuaXNUZXh0YXJlYU5lYXJCb3R0b20oZWxlbSwgc3R5bGUpLFxuXHRcdG9sZEhlaWdodCAgICA9IHN0eWxlLmhlaWdodCxcblx0XHRjaGFuZ2U7XG5cblx0ZWxlbS5zdHlsZS5oZWlnaHQgPSAnJztcblx0ZWxlbS5zdHlsZS5oZWlnaHQgPSBlbGVtLnNjcm9sbEhlaWdodCArIHV0aWwuZ2V0SGVpZ2h0T2Zmc2V0KHN0eWxlKSArICdweCc7XG5cblx0Y2hhbmdlICAgICAgICAgICAgICAgPSBnZXRIZWlnaHRDaGFuZ2Uob2xkSGVpZ2h0LCBzdHlsZS5oZWlnaHQpO1xuXHRlbGVtLnN0eWxlLm92ZXJmbG93WSA9ICcnO1xuXG5cdGlmIChjaGFuZ2UpIHtcblx0XHR1dGlsLmVtaXRDdXN0b21FdmVudChlbGVtLCAnZmxleGZpZWxkLnJlc2l6ZScsIHtjaGFuZ2VUeXBlOiBjaGFuZ2V9KTtcblxuXHRcdC8vIElmIGZpcnN0IHRyaWdnZXIgY2F1c2VkIHZlcnRpY2FsIHNjcm9sbGJhciB0byBiZSBkaXNwbGF5ZWQsXG5cdFx0Ly8gYm9keSB3aWR0aCBzaHJpbmtzIGluIHNvbWUgYnJvd3NlcnMgYW5kIHNvbWUgaW5wdXRzIG1heSBuZWVkXG5cdFx0Ly8gdG8gYmUgc2l6ZWQgYWdhaW4uIFJlLXRyaWdnZXIuXG5cdFx0aWYgKHV0aWwuYm9keVdpZHRoQ2hhbmdlZCgpKSB7XG5cdFx0XHRyZXNpemVBbGwoKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoaXNOZWFyQm90dG9tKSB7XG5cdFx0dXRpbC5zY3JvbGxUb0JvdHRvbShlbGVtKTtcblx0fVxufVxuXG5cbi8qKlxuICogTWFudWFsbHkgdHJpZ2dlciBhbGwgZmxleGZpZWxkIGlucHV0cyB0byByZXNpemUuXG4gKlxuICogVXNlZnVsIGluIGNlcnRhaW4gc2l0dWF0aW9ucywgc3VjaCBhcyBvbiBhcHAgaW5pdCxcbiAqIGFuZCBvbiB3aW5kb3cgcmVzaXplLCB3aGVuIHRoZSBzaXplIG9mIGFsbCBlbGVtZW50cyBtYXkgY2hhbmdlLlxuICpcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gcmVzaXplQWxsKCkge1xuXHQvLyBjbGFzc05hbWUgaXMgc2V0IG9uIHRoaXMgZnVuY3Rpb24gb24gaW5pdCBjYWxsLCBhbmQgdXNlZCBhcyBzZWxlY3RvclxuXHR2YXIgZWxlbXMgICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShyZXNpemVBbGwuY2xhc3NOYW1lKSxcblx0XHRkZWxheUFjdGlvbnMgPSBldmVudHNMaXN0KCkuZGVsYXlBY3Rpb25zO1xuXG5cdEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoZWxlbXMsIGZ1bmN0aW9uIChlbGVtKSB7XG5cdFx0cmVzaXplKGVsZW0sIGRlbGF5QWN0aW9ucyk7XG5cdH0pO1xuXG5cdC8vIElmIGZpcnN0IHRyaWdnZXIgY2F1c2VkIHZlcnRpY2FsIHNjcm9sbGJhciB0byBiZSBkaXNwbGF5ZWQsXG5cdC8vIGJvZHkgd2lkdGggc2hyaW5rcyBpbiBzb21lIGJyb3dzZXJzIGFuZCBzb21lIGlucHV0cyBtYXkgbmVlZFxuXHQvLyB0byBiZSBzaXplZCBhZ2Fpbi4gUmUtdHJpZ2dlci5cblx0aWYgKHV0aWwuYm9keVdpZHRoQ2hhbmdlZCgpKSB7XG5cdFx0cmVzaXplQWxsKCk7XG5cdH1cbn1cblxuXG4vKipcbiAqIFNldCB0aGUgY2xhc3NuYW1lIHRoYXQgc2hvdWxkIGJlIHVzZWQgYnkgdGhlIHJlc2l6ZUFsbCBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gY2xhc3NOYW1lIHtTdHJpbmd9XG4gKi9cbnJlc2l6ZUFsbC5zZXRTZWxlY3RvciA9IGZ1bmN0aW9uIChjbGFzc05hbWUpIHtcblx0cmVzaXplQWxsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGV2ZW50c0xpc3Q6IGV2ZW50c0xpc3QsXG5cdHJlc2l6ZTogICAgIHJlc2l6ZSxcblx0cmVzaXplQWxsOiAgcmVzaXplQWxsXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEVtaXQgYSBjdXN0b20gZXZlbnQuXG4gKlxuICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG4gKiBAcGFyYW0gZXZlbnROYW1lIHtTdHJpbmd9XG4gKiBAcGFyYW0gZGV0YWlsIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGVtaXRDdXN0b21FdmVudChlbGVtLCBldmVudE5hbWUsIGRldGFpbCkge1xuXHR2YXIgZXZlbnQsXG5cdFx0b3B0aW9ucyA9IHtidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IGRldGFpbH07XG5cblx0aWYgKHdpbmRvdy5DdXN0b21FdmVudCkge1xuXHRcdGlmIChkZXRhaWwpIG9wdGlvbnMuZGV0YWlsID0gZGV0YWlsO1xuXHRcdGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50TmFtZSwgb3B0aW9ucyk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gSUVcblx0XHRldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuXHRcdGV2ZW50LmluaXRDdXN0b21FdmVudChldmVudE5hbWUsIG9wdGlvbnMuYnViYmxlcywgb3B0aW9ucy5jYW5jZWxhYmxlLCBvcHRpb25zLmRldGFpbCk7XG5cdH1cblxuXHRlbGVtLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufVxuXG5cbi8qKlxuICogQXBwbHkgYW4gZXZlbnQgbGlzdGVuZXIgdG8gYW4gZWxlbWVudC5cbiAqIFBhc3Mgb3B0aW9uYWwgZGVsZWdhdGVDbGFzcyBwYXJhbWV0ZXIgdG8gZGVsZWdhdGUgdGhlIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlbGVtIHtFbGVtZW50LCBEb2N1bWVudCwgV2luZG93fVxuICogQHBhcmFtIGV2ZW50cyB7QXJyYXl9XG4gKiBAcGFyYW0gY2Ige0Z1bmN0aW9ufVxuICogQHBhcmFtIFtkZWxlZ2F0ZUNsYXNzXSB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBldmVudExpc3RlbmVyKGVsZW0sIGV2ZW50cywgY2IsIGRlbGVnYXRlQ2xhc3MpIHtcblxuXHR2YXIgZnVuYyA9IGNiO1xuXG5cdC8vIElmIGRlZmluZWQsIGV4ZWN1dGUgZnVuY3Rpb24gb25seSB3aGVuIHRhcmdldCBoYXMgZGVsZWdhdGUgY2xhc3Ncblx0aWYgKHR5cGVvZiBkZWxlZ2F0ZUNsYXNzID09PSAnc3RyaW5nJykge1xuXHRcdGZ1bmMgPSBmdW5jdGlvbiAoZSkge1xuXHRcdFx0aWYgKGhhc0NsYXNzKGUudGFyZ2V0LCBkZWxlZ2F0ZUNsYXNzKSkge1xuXHRcdFx0XHRjYi5jYWxsKGUudGFyZ2V0LCBlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRldmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRlbGVtLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGZ1bmMsIGZhbHNlKTtcblx0fSk7XG5cbn1cblxuXG4vKipcbiAqIENoZWNrIHRoYXQgYW4gZWxlbWVudCBoYXMgYSBjbGFzcy5cbiAqIEJhc2VkIG9uIGpRdWVyeSAxLjEyLjAgaGFzQ2xhc3MgaW1wbGVtZW50YXRpb25cbiAqXG4gKiBAcGFyYW0gZWxlbSB7RWxlbWVudH1cbiAqIEBwYXJhbSBjbGFzc05hbWUge1N0cmluZ31cbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBoYXNDbGFzcyhlbGVtLCBjbGFzc05hbWUpIHtcblx0Y2xhc3NOYW1lID0gJyAnICsgY2xhc3NOYW1lICsgJyAnO1xuXHRyZXR1cm4gKCcgJyArIGVsZW0uY2xhc3NOYW1lICsgJyAnKS5yZXBsYWNlKC9bXFx0XFxyXFxuXFxmXS9nLCAnICcpLmluZGV4T2YoY2xhc3NOYW1lKSAhPT0gLTE7XG59XG5cblxuLyoqXG4gKiBBZGQgYSBjbGFzcyB0byBhbiBlbGVtZW50XG4gKlxuICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG4gKiBAcGFyYW0gY2xhc3NOYW1lIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7U3RyaW5nfSAtIEVsZW1lbnQncyBuZXcsIGZ1bGwgY2xhc3NOYW1lXG4gKi9cbmZ1bmN0aW9uIGFkZENsYXNzKGVsZW0sIGNsYXNzTmFtZSkge1xuXHRpZiAoZWxlbS5jbGFzc05hbWUpIHtcblx0XHRjbGFzc05hbWUgPSAnICcgKyBjbGFzc05hbWU7XG5cdH1cblxuXHRyZXR1cm4gZWxlbS5jbGFzc05hbWUgKz0gY2xhc3NOYW1lO1xufVxuXG5cbi8qKlxuICogSGFzIHRoZSBib2R5IGVsZW1lbnQgd2lkdGggY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoaXMgZnVuY3Rpb24gd2FzIGNhbGxlZD9cbiAqXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gYm9keVdpZHRoQ2hhbmdlZCgpIHtcblx0dmFyIHdpZHRoICAgICAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoLFxuXHRcdGhhc0NoYW5nZWQgPSB3aWR0aCAhPT0gYm9keVdpZHRoQ2hhbmdlZC5sYXN0V2lkdGg7XG5cblx0Ym9keVdpZHRoQ2hhbmdlZC5sYXN0V2lkdGggPSB3aWR0aDtcblxuXHRyZXR1cm4gaGFzQ2hhbmdlZDtcbn1cbmJvZHlXaWR0aENoYW5nZWQubGFzdFdpZHRoID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblxuXG4vKipcbiAqIElzIHRoZSBicm93c2VyIEludGVybmV0IEV4cGxvcmVyIDk/XG4gKiBJRTkgaXMgYSBzcGVjaWFsIGNhc2UgYXMgaXQgaGFzIHRoZSBvbmlucHV0IGV2ZW50LCBidXQgaXQgYmVoYXZlcyBkaWZmZXJlbnRseSB0b1xuICogbW9kZXJuIGJyb3dzZXIgaW1wbGVtZW50YXRpb25zLlxuICpcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0llOSgpIHtcblx0cmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTVNJRSA5JykgIT09IC0xO1xufVxuXG5cbi8qKlxuICogU3VtcyBhIGxpc3Qgb2YgbnVtZXJpYyB2YWx1ZXMuXG4gKiBAcGFyYW0gey4uLihOdW1iZXJ8U3RyaW5nKX1cbiAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIHN1bUZsb2F0cygpIHtcblx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UuY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uIChwcmV2LCBjdXJyZW50KSB7XG5cdFx0cmV0dXJuIHByZXYgKyBwYXJzZUZsb2F0KGN1cnJlbnQpO1xuXHR9LCAwKVxufVxuXG5cbi8qKlxuICogU2Nyb2xsIHRvIHRoZSBib3R0b20gb2YgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0gZWxlbSB7RWxlbWVudH1cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICovXG5mdW5jdGlvbiBzY3JvbGxUb0JvdHRvbShlbGVtKSB7XG5cdGVsZW0uc2Nyb2xsVG9wID0gZWxlbS5zY3JvbGxIZWlnaHQ7XG5cdHJldHVybiBlbGVtO1xufVxuXG5cbi8qKlxuICogSXMgdGhlIGlubmVyIHNjcm9sbCBvZiB0aGUgdGV4dGFyZWFzIGNsb3NlIHRvIHRoZSBib3R0b20/XG4gKiBUYWtlcyBpbnRvIGFjY291bnQgY3Vyc29yIHBvc2l0aW9uLlxuICpcbiAqIEBwYXJhbSBlbGVtIHtIVE1MVGV4dEFyZWFFbGVtZW50fVxuICogQHBhcmFtIFtzdHlsZV0ge0NTU1N0eWxlRGVjbGFyYXRpb259XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUZXh0YXJlYU5lYXJCb3R0b20oZWxlbSwgc3R5bGUpIHtcblxuXHRzdHlsZSA9IHN0eWxlIHx8IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0sIG51bGwpO1xuXG5cdHZhciBpc1Njcm9sbGVkTmVhckJvdHRvbSA9IGVsZW0uc2Nyb2xsVG9wICsgZWxlbS5jbGllbnRIZWlnaHQgPiBlbGVtLnNjcm9sbEhlaWdodCAtIChwYXJzZUZsb2F0KHN0eWxlLmxpbmVIZWlnaHQpICogMiksXG5cdFx0aXNUeXBpbmdOZWFyQm90dG9tICAgPSBlbGVtLnNlbGVjdGlvblN0YXJ0ID4gZWxlbS52YWx1ZS5sZW5ndGggLSA0MDtcblxuXHRyZXR1cm4gaXNTY3JvbGxlZE5lYXJCb3R0b20gJiYgaXNUeXBpbmdOZWFyQm90dG9tO1xufVxuXG5cbi8qKlxuICogU2V0dGluZyBhbiBlbGVtZW50J3MgaGVpZ2h0IGluIENTUyBpcyBjb21wbGljYXRlZCBieSB0aGUgZmFjdCB0aGF0XG4gKiBkaWZmZXJlbnQgaGVpZ2h0IHZhbHVlcyBuZWVkIHRvIGJlIGFwcGxpZWQgZGVwZW5kaW5nIG9uIHRoZSBlbGVtZW50J3NcbiAqIGJveC1zaXppbmcgdmFsdWUuIENhbGN1bGF0ZSB0aGUgb2Zmc2V0IG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0gY29tcHV0ZWRTdHlsZSB7Q1NTU3R5bGVEZWNsYXJhdGlvbn1cbiAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldEhlaWdodE9mZnNldChjb21wdXRlZFN0eWxlKSB7XG5cdGlmIChjb21wdXRlZFN0eWxlLmJveFNpemluZyA9PT0gJ2JvcmRlci1ib3gnKSB7XG5cdFx0cmV0dXJuIHN1bUZsb2F0cyhjb21wdXRlZFN0eWxlLmJvcmRlclRvcFdpZHRoLCBjb21wdXRlZFN0eWxlLmJvcmRlckJvdHRvbVdpZHRoKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gLXN1bUZsb2F0cyhjb21wdXRlZFN0eWxlLnBhZGRpbmdUb3AsIGNvbXB1dGVkU3R5bGUucGFkZGluZ0JvdHRvbSk7XG5cdH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0ZW1pdEN1c3RvbUV2ZW50OiAgICAgIGVtaXRDdXN0b21FdmVudCxcblx0ZXZlbnRMaXN0ZW5lcjogICAgICAgIGV2ZW50TGlzdGVuZXIsXG5cdGJvZHlXaWR0aENoYW5nZWQ6ICAgICBib2R5V2lkdGhDaGFuZ2VkLFxuXHRoYXNDbGFzczogICAgICAgICAgICAgaGFzQ2xhc3MsXG5cdGFkZENsYXNzOiAgICAgICAgICAgICBhZGRDbGFzcyxcblx0aXNJZTk6ICAgICAgICAgICAgICAgIGlzSWU5LFxuXHRpc1RleHRhcmVhTmVhckJvdHRvbTogaXNUZXh0YXJlYU5lYXJCb3R0b20sXG5cdHNjcm9sbFRvQm90dG9tOiAgICAgICBzY3JvbGxUb0JvdHRvbSxcblx0Z2V0SGVpZ2h0T2Zmc2V0OiAgICAgIGdldEhlaWdodE9mZnNldFxufTtcbiJdfQ==
