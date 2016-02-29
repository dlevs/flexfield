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

		util.addClass(document.documentElement, 'flexfield-active');

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
		eventsList.cache = ['input'];

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
 * @returns {Boolean}
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

	var style        = window.getComputedStyle(elem, null),
		isNearBottom = util.isTextareaNearBottom(elem, style),
		oldHeight    = style.height,
		change;


	elem.style.height = '';
	elem.style.height = elem.scrollHeight + util.getHeightOffset(style) + 'px';


	if (style.height === style.maxHeight) {
		elem.style.overflowY = 'scroll';
	} else {
		elem.style.overflowY = 'hidden';
	}


	if (isNearBottom) {
		util.scrollToBottom(elem);
	}
	

	change = getHeightChange(oldHeight, style.height);

	if (change) {
		util.emitCustomEvent(elem, 'flexfield-resize', {change: change});

		// If first trigger caused vertical scrollbar to be displayed,
		// body width shrinks in some browsers and some inputs may need
		// to be sized again. Re-trigger.
		if (util.bodyWidthChanged()) {
			resizeAll();
		}
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
 * @param elem {Element, Document}
 * @param eventName {String}
 * @param [detail] {Object}
 */
function emitCustomEvent(elem, eventName, detail) {
	var event,
		options = {bubbles: true, cancelable: true, detail: detail};

	if (window.CustomEvent) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwL2luZGV4LmpzIiwic3JjL2FwcC9pbml0LmpzIiwic3JjL2FwcC9tZXRob2RzLmpzIiwic3JjL2FwcC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBFeHBvc2Ugc2luZ2xlIG9iamVjdFxud2luZG93LmZsZXhmaWVsZCA9IHJlcXVpcmUoJy4vaW5pdCcpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWV0aG9kcyA9IHJlcXVpcmUoJy4vbWV0aG9kcycpO1xudmFyIHV0aWwgICAgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGFwcCA9IHtpbml0OiBpbml0fTtcblxuXG4vKipcbiAqIFN0YXJ0IHVwIHRoZSBGbGV4RmllbGQgcGx1Z2luLlxuICpcbiAqIEBwYXJhbSBbY2xhc3NOYW1lPWpzLWZsZXhmaWVsZF0ge1N0cmluZ30gLSBUaGUgY2xhc3NOYW1lIHVzZWQgYnkgdGhlIHBsdWdpbiB0byB0YXJnZXQgZWxlbWVudHMuXG4gKi9cbmZ1bmN0aW9uIGluaXQoY2xhc3NOYW1lKSB7XG5cdHRyeSB7XG5cdFx0Y2xhc3NOYW1lID0gY2xhc3NOYW1lIHx8ICdqcy1mbGV4ZmllbGQnO1xuXG5cdFx0Ly8gUmVtb3ZlIGxlYWRpbmcgZnVsbHN0b3AgdG8gYWxsb3cgc2VsZWN0b3Itc3R5bGUgc3RyaW5nXG5cdFx0aWYgKGNsYXNzTmFtZVswXSA9PT0gJy4nKSB7XG5cdFx0XHRjbGFzc05hbWUgPSBjbGFzc05hbWUuc2xpY2UoMSk7XG5cdFx0fVxuXG5cdFx0Ly8gUHVibGljIG1ldGhvZHMgZXhwb3NlZCBmb3IgdXNlclxuXHRcdGFwcC50cmlnZ2VyID0gbWV0aG9kcy5yZXNpemU7XG5cdFx0Ly8gYXBwLnRyaWdnZXJBbGwgPSBtZXRob2RzLnJlc2l6ZUFsbDtcblxuXHRcdC8vIEluaXQgYWN0aW9uc1xuXHRcdG1ldGhvZHMucmVzaXplQWxsLnNldFNlbGVjdG9yKGNsYXNzTmFtZSk7XG5cblx0XHRpbml0RXZlbnRMaXN0ZW5lcnMoY2xhc3NOYW1lKTtcblxuXHRcdC8vIEluaXRpYWwgdHJpZ2dlciBldmVudHMgZm9yIHdoZW4gZmllbGRzIGFyZSBhbHJlYWR5IHBvcHVsYXRlZC5cblx0XHRtZXRob2RzLnJlc2l6ZUFsbCgpO1xuXG5cdFx0dXRpbC5hZGRDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICdmbGV4ZmllbGQtYWN0aXZlJyk7XG5cblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS53YXJuKCdUaGlzIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGUgRmxleGZpZWxkIHBsdWdpbi4nKTtcblx0fVxuXG5cdC8vIENhbiBvbmx5IGNhbGwgaW5pdCBvbmNlLlxuXHRhcHAuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAod2luZG93LmNvbnNvbGUpIGNvbnNvbGUud2FybignTXVsdGlwbGUgY2FsbHMgbWFkZSB0byBmbGV4ZmllbGQuaW5pdCBmdW5jdGlvbi4gVGhpcyBjYW4gb25seSBiZSBjYWxsZWQgb25jZS4nKTtcblx0fTtcbn1cblxuXG4vKipcbiAqIEF0dGFjaCBldmVudHMuXG4gKlxuICogQHBhcmFtIHRhcmdldENsYXNzTmFtZSB7U3RyaW5nfSAtIFRoZSBjbGFzc05hbWUgdXNlZCBieSB0aGUgcGx1Z2luIHRvIHRhcmdldCBlbGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gaW5pdEV2ZW50TGlzdGVuZXJzKHRhcmdldENsYXNzTmFtZSkge1xuXG5cdHV0aWwuZXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgbWV0aG9kcy5ldmVudHNMaXN0KCksIGZ1bmN0aW9uIChlKSB7XG5cdFx0bWV0aG9kcy5yZXNpemUoZS50YXJnZXQsIGUudHlwZSAhPT0gJ2lucHV0Jyk7XG5cdH0sIHRhcmdldENsYXNzTmFtZSk7XG5cblx0Ly8gUmVzaXppbmcgdGhlIHdpbmRvdyBjYW4gY2F1c2UgdGV4dGFyZWFzIHRvIGdyb3cgb3Igc2hyaW5rLiBUcmlnZ2VyIGZsZXhmaWVsZC5cblx0dXRpbC5ldmVudExpc3RlbmVyKHdpbmRvdywgWydyZXNpemUnXSwgbWV0aG9kcy5yZXNpemVBbGwpXG5cbn1cblxuXG4vLyBFeHBvc2Ugc2luZ2xlIG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBhcHA7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG4vKipcbiAqIEdldCB0aGUgbGlzdCBvZiBldmVudHMgdG8gbGlzdGVuIGZvciBkZXBlbmRpbmcgb24gdGhlIGJyb3dzZXIuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBldmVudHNMaXN0KCkge1xuXHRpZiAoIWV2ZW50c0xpc3QuY2FjaGUpIHtcblx0XHRldmVudHNMaXN0LmNhY2hlID0gWydpbnB1dCddO1xuXG5cdFx0Ly8gSWYgYnJvd3NlciBpcyBJRTkgKG5vbi1zdGFuZGFyZCBvbmlucHV0IGV2ZW50KSwgb3IgZG9jdW1lbnQgaGFzIE1vZGVybml6ciBjbGFzc1xuXHRcdC8vIHRvIHNob3cgbGFjayBvbiBvbmlucHV0IGV2ZW50LCB1c2UgYWx0ZXJuYXRpdmVzLlxuXHRcdGlmICh1dGlsLmlzSWU5KCkgfHwgdXRpbC5oYXNDbGFzcyhkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsICduby1vbmlucHV0JykpIHtcblx0XHRcdGV2ZW50c0xpc3QuY2FjaGUgICAgICAgICAgICAgID0gZXZlbnRzTGlzdC5jYWNoZS5jb25jYXQoWydrZXlkb3duJywgJ2N1dCcsICdwYXN0ZSddKTtcblx0XHRcdGV2ZW50c0xpc3QuY2FjaGUuZGVsYXlBY3Rpb25zID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXZlbnRzTGlzdC5jYWNoZS5kZWxheUFjdGlvbnMgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzTGlzdC5jYWNoZTtcbn1cblxuXG4vKipcbiAqIENvbXBhcmUgdHdvIGhlaWdodHMgYW5kIHJldHVybiBmYWxzZSBpZiBubyBkaWZmZXJlbmNlLCBvciBkZXNjcmlwdGlvbiBvZiB0aGUgY2hhbmdlLlxuICpcbiAqIEBwYXJhbSBvbGRIZWlnaHQge051bWJlcn1cbiAqIEBwYXJhbSBuZXdIZWlnaHQge051bWJlcn1cbiAqIEByZXR1cm5zIHtCb29sZWFuLCBTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdldEhlaWdodENoYW5nZShvbGRIZWlnaHQsIG5ld0hlaWdodCkge1xuXHR2YXIgY2hhbmdlID0gZmFsc2U7XG5cblx0b2xkSGVpZ2h0ID0gcGFyc2VGbG9hdChvbGRIZWlnaHQpO1xuXHRuZXdIZWlnaHQgPSBwYXJzZUZsb2F0KG5ld0hlaWdodCk7XG5cblx0aWYgKG5ld0hlaWdodCAhPT0gb2xkSGVpZ2h0KSB7XG5cdFx0Y2hhbmdlID0gbmV3SGVpZ2h0IDwgb2xkSGVpZ2h0ID8gJ3NocmluaycgOiAnZ3Jvdyc7XG5cdH1cblxuXHRyZXR1cm4gY2hhbmdlO1xufVxuXG5cbi8qKlxuICogU2V0IHRoZSBoZWlnaHQgb2YgYW4gZWxlbWVudCB0byBtYXRjaCBpdHMgc2Nyb2xsSGVpZ2h0LlxuICogSWYgdGhlIGhlaWdodCBoYXMgY2hhbmdlZCwgZmlyZSBhbiBldmVudC5cbiAqXG4gKiBAcHVibGljXG4gKlxuICogQHBhcmFtIGVsZW0ge0hUTUxUZXh0QXJlYUVsZW1lbnR9XG4gKiBAcGFyYW0gW2RlbGF5PWZhbHNlXSB7Qm9vbGVhbn0gLSBQdXNoIGFjdGlvbiB0byBiYWNrIG9mIGV2ZW50IHF1ZXVlIC0gZm9yIGV2ZW50cyBsaWtlIGtleWRvd24gYW5kIHBhc3RlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gcmVzaXplKGVsZW0sIGRlbGF5KSB7XG5cblx0Ly8gSWYga2V5ZG93bi8gcGFzdGUgZXZlbnRzIGFyZSB1c2VkIGluc3RlYWQgb2YgYW4gaW5wdXQgZXZlbnQsIG1lYXN1cmluZ1xuXHQvLyBvZiBpbnB1dCBzY3JvbGxIZWlnaHQgbmVlZHMgdG8gYmUgZGVsYXllZCB1bnRpbCB0aGUgdGV4dCBjb250ZW50IGhhcyBjaGFuZ2VkLlxuXHRpZiAoZGVsYXkpIHtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0cmVzaXplKGVsZW0pO1xuXHRcdH0sIDApO1xuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIHN0eWxlICAgICAgICA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0sIG51bGwpLFxuXHRcdGlzTmVhckJvdHRvbSA9IHV0aWwuaXNUZXh0YXJlYU5lYXJCb3R0b20oZWxlbSwgc3R5bGUpLFxuXHRcdG9sZEhlaWdodCAgICA9IHN0eWxlLmhlaWdodCxcblx0XHRjaGFuZ2U7XG5cblxuXHRlbGVtLnN0eWxlLmhlaWdodCA9ICcnO1xuXHRlbGVtLnN0eWxlLmhlaWdodCA9IGVsZW0uc2Nyb2xsSGVpZ2h0ICsgdXRpbC5nZXRIZWlnaHRPZmZzZXQoc3R5bGUpICsgJ3B4JztcblxuXG5cdGlmIChzdHlsZS5oZWlnaHQgPT09IHN0eWxlLm1heEhlaWdodCkge1xuXHRcdGVsZW0uc3R5bGUub3ZlcmZsb3dZID0gJ3Njcm9sbCc7XG5cdH0gZWxzZSB7XG5cdFx0ZWxlbS5zdHlsZS5vdmVyZmxvd1kgPSAnaGlkZGVuJztcblx0fVxuXG5cblx0aWYgKGlzTmVhckJvdHRvbSkge1xuXHRcdHV0aWwuc2Nyb2xsVG9Cb3R0b20oZWxlbSk7XG5cdH1cblx0XG5cblx0Y2hhbmdlID0gZ2V0SGVpZ2h0Q2hhbmdlKG9sZEhlaWdodCwgc3R5bGUuaGVpZ2h0KTtcblxuXHRpZiAoY2hhbmdlKSB7XG5cdFx0dXRpbC5lbWl0Q3VzdG9tRXZlbnQoZWxlbSwgJ2ZsZXhmaWVsZC1yZXNpemUnLCB7Y2hhbmdlOiBjaGFuZ2V9KTtcblxuXHRcdC8vIElmIGZpcnN0IHRyaWdnZXIgY2F1c2VkIHZlcnRpY2FsIHNjcm9sbGJhciB0byBiZSBkaXNwbGF5ZWQsXG5cdFx0Ly8gYm9keSB3aWR0aCBzaHJpbmtzIGluIHNvbWUgYnJvd3NlcnMgYW5kIHNvbWUgaW5wdXRzIG1heSBuZWVkXG5cdFx0Ly8gdG8gYmUgc2l6ZWQgYWdhaW4uIFJlLXRyaWdnZXIuXG5cdFx0aWYgKHV0aWwuYm9keVdpZHRoQ2hhbmdlZCgpKSB7XG5cdFx0XHRyZXNpemVBbGwoKTtcblx0XHR9XG5cdH1cbn1cblxuXG4vKipcbiAqIE1hbnVhbGx5IHRyaWdnZXIgYWxsIGZsZXhmaWVsZCBpbnB1dHMgdG8gcmVzaXplLlxuICpcbiAqIFVzZWZ1bCBpbiBjZXJ0YWluIHNpdHVhdGlvbnMsIHN1Y2ggYXMgb24gYXBwIGluaXQsXG4gKiBhbmQgb24gd2luZG93IHJlc2l6ZSwgd2hlbiB0aGUgc2l6ZSBvZiBhbGwgZWxlbWVudHMgbWF5IGNoYW5nZS5cbiAqXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIHJlc2l6ZUFsbCgpIHtcblx0Ly8gY2xhc3NOYW1lIGlzIHNldCBvbiB0aGlzIGZ1bmN0aW9uIG9uIGluaXQgY2FsbCwgYW5kIHVzZWQgYXMgc2VsZWN0b3Jcblx0dmFyIGVsZW1zICAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUocmVzaXplQWxsLmNsYXNzTmFtZSksXG5cdFx0ZGVsYXlBY3Rpb25zID0gZXZlbnRzTGlzdCgpLmRlbGF5QWN0aW9ucztcblxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGVsZW1zLCBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdHJlc2l6ZShlbGVtLCBkZWxheUFjdGlvbnMpO1xuXHR9KTtcblxuXHQvLyBJZiBmaXJzdCB0cmlnZ2VyIGNhdXNlZCB2ZXJ0aWNhbCBzY3JvbGxiYXIgdG8gYmUgZGlzcGxheWVkLFxuXHQvLyBib2R5IHdpZHRoIHNocmlua3MgaW4gc29tZSBicm93c2VycyBhbmQgc29tZSBpbnB1dHMgbWF5IG5lZWRcblx0Ly8gdG8gYmUgc2l6ZWQgYWdhaW4uIFJlLXRyaWdnZXIuXG5cdGlmICh1dGlsLmJvZHlXaWR0aENoYW5nZWQoKSkge1xuXHRcdHJlc2l6ZUFsbCgpO1xuXHR9XG59XG5cblxuLyoqXG4gKiBTZXQgdGhlIGNsYXNzbmFtZSB0aGF0IHNob3VsZCBiZSB1c2VkIGJ5IHRoZSByZXNpemVBbGwgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIGNsYXNzTmFtZSB7U3RyaW5nfVxuICovXG5yZXNpemVBbGwuc2V0U2VsZWN0b3IgPSBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG5cdHJlc2l6ZUFsbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRldmVudHNMaXN0OiBldmVudHNMaXN0LFxuXHRyZXNpemU6ICAgICByZXNpemUsXG5cdHJlc2l6ZUFsbDogIHJlc2l6ZUFsbFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFbWl0IGEgY3VzdG9tIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlbGVtIHtFbGVtZW50LCBEb2N1bWVudH1cbiAqIEBwYXJhbSBldmVudE5hbWUge1N0cmluZ31cbiAqIEBwYXJhbSBbZGV0YWlsXSB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBlbWl0Q3VzdG9tRXZlbnQoZWxlbSwgZXZlbnROYW1lLCBkZXRhaWwpIHtcblx0dmFyIGV2ZW50LFxuXHRcdG9wdGlvbnMgPSB7YnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiBkZXRhaWx9O1xuXG5cdGlmICh3aW5kb3cuQ3VzdG9tRXZlbnQpIHtcblx0XHRldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudE5hbWUsIG9wdGlvbnMpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIElFXG5cdFx0ZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcblx0XHRldmVudC5pbml0Q3VzdG9tRXZlbnQoZXZlbnROYW1lLCBvcHRpb25zLmJ1YmJsZXMsIG9wdGlvbnMuY2FuY2VsYWJsZSwgb3B0aW9ucy5kZXRhaWwpO1xuXHR9XG5cblx0ZWxlbS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG4vKipcbiAqIEFwcGx5IGFuIGV2ZW50IGxpc3RlbmVyIHRvIGFuIGVsZW1lbnQuXG4gKiBQYXNzIG9wdGlvbmFsIGRlbGVnYXRlQ2xhc3MgcGFyYW1ldGVyIHRvIGRlbGVnYXRlIHRoZSBldmVudC5cbiAqXG4gKiBAcGFyYW0gZWxlbSB7RWxlbWVudCwgRG9jdW1lbnQsIFdpbmRvd31cbiAqIEBwYXJhbSBldmVudHMge0FycmF5fVxuICogQHBhcmFtIGNiIHtGdW5jdGlvbn1cbiAqIEBwYXJhbSBbZGVsZWdhdGVDbGFzc10ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXZlbnRMaXN0ZW5lcihlbGVtLCBldmVudHMsIGNiLCBkZWxlZ2F0ZUNsYXNzKSB7XG5cblx0dmFyIGZ1bmMgPSBjYjtcblxuXHQvLyBJZiBkZWZpbmVkLCBleGVjdXRlIGZ1bmN0aW9uIG9ubHkgd2hlbiB0YXJnZXQgaGFzIGRlbGVnYXRlIGNsYXNzXG5cdGlmICh0eXBlb2YgZGVsZWdhdGVDbGFzcyA9PT0gJ3N0cmluZycpIHtcblx0XHRmdW5jID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChoYXNDbGFzcyhlLnRhcmdldCwgZGVsZWdhdGVDbGFzcykpIHtcblx0XHRcdFx0Y2IuY2FsbChlLnRhcmdldCwgZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBmdW5jLCBmYWxzZSk7XG5cdH0pO1xuXG59XG5cblxuLyoqXG4gKiBDaGVjayB0aGF0IGFuIGVsZW1lbnQgaGFzIGEgY2xhc3MuXG4gKiBCYXNlZCBvbiBqUXVlcnkgMS4xMi4wIGhhc0NsYXNzIGltcGxlbWVudGF0aW9uXG4gKlxuICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG4gKiBAcGFyYW0gY2xhc3NOYW1lIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaGFzQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKSB7XG5cdGNsYXNzTmFtZSA9ICcgJyArIGNsYXNzTmFtZSArICcgJztcblx0cmV0dXJuICgnICcgKyBlbGVtLmNsYXNzTmFtZSArICcgJykucmVwbGFjZSgvW1xcdFxcclxcblxcZl0vZywgJyAnKS5pbmRleE9mKGNsYXNzTmFtZSkgIT09IC0xO1xufVxuXG5cbi8qKlxuICogQWRkIGEgY2xhc3MgdG8gYW4gZWxlbWVudFxuICpcbiAqIEBwYXJhbSBlbGVtIHtFbGVtZW50fVxuICogQHBhcmFtIGNsYXNzTmFtZSB7U3RyaW5nfVxuICogQHJldHVybnMge1N0cmluZ30gLSBFbGVtZW50J3MgbmV3LCBmdWxsIGNsYXNzTmFtZVxuICovXG5mdW5jdGlvbiBhZGRDbGFzcyhlbGVtLCBjbGFzc05hbWUpIHtcblx0aWYgKGVsZW0uY2xhc3NOYW1lKSB7XG5cdFx0Y2xhc3NOYW1lID0gJyAnICsgY2xhc3NOYW1lO1xuXHR9XG5cblx0cmV0dXJuIGVsZW0uY2xhc3NOYW1lICs9IGNsYXNzTmFtZTtcbn1cblxuXG4vKipcbiAqIEhhcyB0aGUgYm9keSBlbGVtZW50IHdpZHRoIGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGlzIGZ1bmN0aW9uIHdhcyBjYWxsZWQ/XG4gKlxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGJvZHlXaWR0aENoYW5nZWQoKSB7XG5cdHZhciB3aWR0aCAgICAgID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCxcblx0XHRoYXNDaGFuZ2VkID0gd2lkdGggIT09IGJvZHlXaWR0aENoYW5nZWQubGFzdFdpZHRoO1xuXG5cdGJvZHlXaWR0aENoYW5nZWQubGFzdFdpZHRoID0gd2lkdGg7XG5cblx0cmV0dXJuIGhhc0NoYW5nZWQ7XG59XG5ib2R5V2lkdGhDaGFuZ2VkLmxhc3RXaWR0aCA9IGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGg7XG5cblxuLyoqXG4gKiBJcyB0aGUgYnJvd3NlciBJbnRlcm5ldCBFeHBsb3JlciA5P1xuICogSUU5IGlzIGEgc3BlY2lhbCBjYXNlIGFzIGl0IGhhcyB0aGUgb25pbnB1dCBldmVudCwgYnV0IGl0IGJlaGF2ZXMgZGlmZmVyZW50bHkgdG9cbiAqIG1vZGVybiBicm93c2VyIGltcGxlbWVudGF0aW9ucy5cbiAqXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNJZTkoKSB7XG5cdHJldHVybiBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUgOScpICE9PSAtMTtcbn1cblxuXG4vKipcbiAqIFN1bXMgYSBsaXN0IG9mIG51bWVyaWMgdmFsdWVzLlxuICogQHBhcmFtIHsuLi4oTnVtYmVyfFN0cmluZyl9XG4gKiBAcmV0dXJucyB7TnVtYmVyfVxuICovXG5mdW5jdGlvbiBzdW1GbG9hdHMoKSB7XG5cdHJldHVybiBBcnJheS5wcm90b3R5cGUucmVkdWNlLmNhbGwoYXJndW1lbnRzLCBmdW5jdGlvbiAocHJldiwgY3VycmVudCkge1xuXHRcdHJldHVybiBwcmV2ICsgcGFyc2VGbG9hdChjdXJyZW50KTtcblx0fSwgMClcbn1cblxuXG4vKipcbiAqIFNjcm9sbCB0byB0aGUgYm90dG9tIG9mIGFuIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG4gKiBAcmV0dXJucyB7RWxlbWVudH1cbiAqL1xuZnVuY3Rpb24gc2Nyb2xsVG9Cb3R0b20oZWxlbSkge1xuXHRlbGVtLnNjcm9sbFRvcCA9IGVsZW0uc2Nyb2xsSGVpZ2h0O1xuXHRyZXR1cm4gZWxlbTtcbn1cblxuXG4vKipcbiAqIElzIHRoZSBpbm5lciBzY3JvbGwgb2YgdGhlIHRleHRhcmVhcyBjbG9zZSB0byB0aGUgYm90dG9tP1xuICogVGFrZXMgaW50byBhY2NvdW50IGN1cnNvciBwb3NpdGlvbi5cbiAqXG4gKiBAcGFyYW0gZWxlbSB7SFRNTFRleHRBcmVhRWxlbWVudH1cbiAqIEBwYXJhbSBbc3R5bGVdIHtDU1NTdHlsZURlY2xhcmF0aW9ufVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVGV4dGFyZWFOZWFyQm90dG9tKGVsZW0sIHN0eWxlKSB7XG5cblx0c3R5bGUgPSBzdHlsZSB8fCB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtLCBudWxsKTtcblxuXHR2YXIgaXNTY3JvbGxlZE5lYXJCb3R0b20gPSBlbGVtLnNjcm9sbFRvcCArIGVsZW0uY2xpZW50SGVpZ2h0ID4gZWxlbS5zY3JvbGxIZWlnaHQgLSAocGFyc2VGbG9hdChzdHlsZS5saW5lSGVpZ2h0KSAqIDIpLFxuXHRcdGlzVHlwaW5nTmVhckJvdHRvbSAgID0gZWxlbS5zZWxlY3Rpb25TdGFydCA+IGVsZW0udmFsdWUubGVuZ3RoIC0gNDA7XG5cblx0cmV0dXJuIGlzU2Nyb2xsZWROZWFyQm90dG9tICYmIGlzVHlwaW5nTmVhckJvdHRvbTtcbn1cblxuXG4vKipcbiAqIFNldHRpbmcgYW4gZWxlbWVudCdzIGhlaWdodCBpbiBDU1MgaXMgY29tcGxpY2F0ZWQgYnkgdGhlIGZhY3QgdGhhdFxuICogZGlmZmVyZW50IGhlaWdodCB2YWx1ZXMgbmVlZCB0byBiZSBhcHBsaWVkIGRlcGVuZGluZyBvbiB0aGUgZWxlbWVudCdzXG4gKiBib3gtc2l6aW5nIHZhbHVlLiBDYWxjdWxhdGUgdGhlIG9mZnNldCBuZWVkZWQuXG4gKlxuICogQHBhcmFtIGNvbXB1dGVkU3R5bGUge0NTU1N0eWxlRGVjbGFyYXRpb259XG4gKiBAcmV0dXJucyB7TnVtYmVyfVxuICovXG5mdW5jdGlvbiBnZXRIZWlnaHRPZmZzZXQoY29tcHV0ZWRTdHlsZSkge1xuXHRpZiAoY29tcHV0ZWRTdHlsZS5ib3hTaXppbmcgPT09ICdib3JkZXItYm94Jykge1xuXHRcdHJldHVybiBzdW1GbG9hdHMoY29tcHV0ZWRTdHlsZS5ib3JkZXJUb3BXaWR0aCwgY29tcHV0ZWRTdHlsZS5ib3JkZXJCb3R0b21XaWR0aCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIC1zdW1GbG9hdHMoY29tcHV0ZWRTdHlsZS5wYWRkaW5nVG9wLCBjb21wdXRlZFN0eWxlLnBhZGRpbmdCb3R0b20pO1xuXHR9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGVtaXRDdXN0b21FdmVudDogICAgICBlbWl0Q3VzdG9tRXZlbnQsXG5cdGV2ZW50TGlzdGVuZXI6ICAgICAgICBldmVudExpc3RlbmVyLFxuXHRib2R5V2lkdGhDaGFuZ2VkOiAgICAgYm9keVdpZHRoQ2hhbmdlZCxcblx0aGFzQ2xhc3M6ICAgICAgICAgICAgIGhhc0NsYXNzLFxuXHRhZGRDbGFzczogICAgICAgICAgICAgYWRkQ2xhc3MsXG5cdGlzSWU5OiAgICAgICAgICAgICAgICBpc0llOSxcblx0aXNUZXh0YXJlYU5lYXJCb3R0b206IGlzVGV4dGFyZWFOZWFyQm90dG9tLFxuXHRzY3JvbGxUb0JvdHRvbTogICAgICAgc2Nyb2xsVG9Cb3R0b20sXG5cdGdldEhlaWdodE9mZnNldDogICAgICBnZXRIZWlnaHRPZmZzZXRcbn07XG4iXX0=
