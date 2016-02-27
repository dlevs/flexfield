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
	isIe9:                isIe9,
	isTextareaNearBottom: isTextareaNearBottom,
	scrollToBottom:       scrollToBottom,
	getHeightOffset:      getHeightOffset
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvaW5pdC5qcyIsInNyYy9tZXRob2RzLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbi8vIEV4cG9zZSBzaW5nbGUgb2JqZWN0XG53aW5kb3cuZmxleGZpZWxkID0gcmVxdWlyZSgnLi9pbml0Jyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtZXRob2RzID0gcmVxdWlyZSgnLi9tZXRob2RzJyk7XG52YXIgdXRpbCAgICA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgYXBwID0ge2luaXQ6IGluaXR9O1xuXG5cbi8qKlxuICogU3RhcnQgdXAgdGhlIEZsZXhGaWVsZCBwbHVnaW4uXG4gKlxuICogQHBhcmFtIFtjbGFzc05hbWU9anMtZmxleGZpZWxkXSB7U3RyaW5nfSAtIFRoZSBjbGFzc05hbWUgdXNlZCBieSB0aGUgcGx1Z2luIHRvIHRhcmdldCBlbGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gaW5pdChjbGFzc05hbWUpIHtcblxuXHRjbGFzc05hbWUgPSBjbGFzc05hbWUgfHwgJ2pzLWZsZXhmaWVsZCc7XG5cblx0Ly8gUmVtb3ZlIGxlYWRpbmcgZnVsbHN0b3AgdG8gYWxsb3cgc2VsZWN0b3Itc3R5bGUgc3RyaW5nXG5cdGlmIChjbGFzc05hbWVbMF0gPT09ICcuJykge1xuXHRcdGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5zbGljZSgxKTtcblx0fVxuXG5cdC8vIFB1YmxpYyBtZXRob2RzIGV4cG9zZWQgZm9yIHVzZXJcblx0YXBwLnRyaWdnZXIgPSBtZXRob2RzLnJlc2l6ZTtcblx0Ly8gYXBwLnRyaWdnZXJBbGwgPSBtZXRob2RzLnJlc2l6ZUFsbDtcblxuXHQvLyBJbml0IGFjdGlvbnNcblx0bWV0aG9kcy5yZXNpemVBbGwuc2V0U2VsZWN0b3IoY2xhc3NOYW1lKTtcblxuXHRpbml0RXZlbnRMaXN0ZW5lcnMoY2xhc3NOYW1lKTtcblxuXHQvLyBJbml0aWFsIHRyaWdnZXIgZXZlbnRzIGZvciB3aGVuIGZpZWxkcyBhcmUgYWxyZWFkeSBwb3B1bGF0ZWQuXG5cdG1ldGhvZHMucmVzaXplQWxsKCk7XG5cblx0Ly8gQ2FuIG9ubHkgY2FsbCBpbml0IG9uY2UuXG5cdGFwcC5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHRcdGNvbnNvbGUud2FybignTXVsdGlwbGUgY2FsbHMgbWFkZSB0byBmbGV4ZmllbGQuaW5pdCBmdW5jdGlvbi4gVGhpcyBjYW4gb25seSBiZSBjYWxsZWQgb25jZS4nKTtcblx0fTtcbn1cblxuXG4vKipcbiAqIEF0dGFjaCBldmVudHMuXG4gKlxuICogQHBhcmFtIHRhcmdldENsYXNzTmFtZSB7U3RyaW5nfSAtIFRoZSBjbGFzc05hbWUgdXNlZCBieSB0aGUgcGx1Z2luIHRvIHRhcmdldCBlbGVtZW50cy5cbiAqL1xuZnVuY3Rpb24gaW5pdEV2ZW50TGlzdGVuZXJzKHRhcmdldENsYXNzTmFtZSkge1xuXG5cdHV0aWwuZXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgbWV0aG9kcy5ldmVudHNMaXN0KCksIGZ1bmN0aW9uIChlKSB7XG5cdFx0bWV0aG9kcy5yZXNpemUoZS50YXJnZXQsIGUudHlwZSAhPT0gJ2lucHV0Jyk7XG5cdH0sIHRhcmdldENsYXNzTmFtZSk7XG5cblx0Ly8gUmVzaXppbmcgdGhlIHdpbmRvdyBjYW4gY2F1c2UgdGV4dGFyZWFzIHRvIGdyb3cgb3Igc2hyaW5rLiBUcmlnZ2VyIGZsZXhmaWVsZC5cblx0dXRpbC5ldmVudExpc3RlbmVyKHdpbmRvdywgWydyZXNpemUnXSwgbWV0aG9kcy5yZXNpemVBbGwpXG5cbn1cblxuXG4vLyBFeHBvc2Ugc2luZ2xlIG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBhcHA7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG4vKipcbiAqIEdldCB0aGUgbGlzdCBvZiBldmVudHMgdG8gbGlzdGVuIGZvciBkZXBlbmRpbmcgb24gdGhlIGJyb3dzZXIuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBldmVudHNMaXN0KCkge1xuXHRpZiAoIWV2ZW50c0xpc3QuY2FjaGUpIHtcblx0XHRldmVudHNMaXN0LmNhY2hlID0gWydpbnB1dCcsICdmbGV4ZmllbGQnXTtcblxuXHRcdC8vIElmIGJyb3dzZXIgaXMgSUU5IChub24tc3RhbmRhcmQgb25pbnB1dCBldmVudCksIG9yIGRvY3VtZW50IGhhcyBNb2Rlcm5penIgY2xhc3Ncblx0XHQvLyB0byBzaG93IGxhY2sgb24gb25pbnB1dCBldmVudCwgdXNlIGFsdGVybmF0aXZlcy5cblx0XHRpZiAodXRpbC5pc0llOSgpIHx8IHV0aWwuaGFzQ2xhc3MoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCAnbm8tb25pbnB1dCcpKSB7XG5cdFx0XHRldmVudHNMaXN0LmNhY2hlICAgICAgICAgICAgICA9IGV2ZW50c0xpc3QuY2FjaGUuY29uY2F0KFsna2V5ZG93bicsICdjdXQnLCAncGFzdGUnXSk7XG5cdFx0XHRldmVudHNMaXN0LmNhY2hlLmRlbGF5QWN0aW9ucyA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV2ZW50c0xpc3QuY2FjaGUuZGVsYXlBY3Rpb25zID0gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV2ZW50c0xpc3QuY2FjaGU7XG59XG5cblxuLyoqXG4gKiBDb21wYXJlIHR3byBoZWlnaHRzIGFuZCByZXR1cm4gZmFsc2UgaWYgbm8gZGlmZmVyZW5jZSwgb3IgZGVzY3JpcHRpb24gb2YgdGhlIGNoYW5nZS5cbiAqXG4gKiBAcGFyYW0gb2xkSGVpZ2h0IHtOdW1iZXJ9XG4gKiBAcGFyYW0gbmV3SGVpZ2h0IHtOdW1iZXJ9XG4gKiBAcmV0dXJucyB7Qm9vbGVhbiwgU3RyaW5nfVxuICovXG5mdW5jdGlvbiBnZXRIZWlnaHRDaGFuZ2Uob2xkSGVpZ2h0LCBuZXdIZWlnaHQpIHtcblx0dmFyIGNoYW5nZSA9IGZhbHNlO1xuXG5cdG9sZEhlaWdodCA9IHBhcnNlRmxvYXQob2xkSGVpZ2h0KTtcblx0bmV3SGVpZ2h0ID0gcGFyc2VGbG9hdChuZXdIZWlnaHQpO1xuXG5cdGlmIChuZXdIZWlnaHQgIT09IG9sZEhlaWdodCkge1xuXHRcdGNoYW5nZSA9IG5ld0hlaWdodCA8IG9sZEhlaWdodCA/ICdzaHJpbmsnIDogJ2dyb3cnO1xuXHR9XG5cblx0cmV0dXJuIGNoYW5nZTtcbn1cblxuXG4vKipcbiAqIFNldCB0aGUgaGVpZ2h0IG9mIGFuIGVsZW1lbnQgdG8gbWF0Y2ggaXRzIHNjcm9sbEhlaWdodC5cbiAqIElmIHRoZSBoZWlnaHQgaGFzIGNoYW5nZWQsIGZpcmUgYW4gZXZlbnQuXG4gKlxuICogQHB1YmxpY1xuICpcbiAqIEBwYXJhbSBlbGVtIHtIVE1MVGV4dEFyZWFFbGVtZW50fVxuICogQHBhcmFtIFtkZWxheT1mYWxzZV0ge0Jvb2xlYW59IC0gUHVzaCBhY3Rpb24gdG8gYmFjayBvZiBldmVudCBxdWV1ZSAtIGZvciBldmVudHMgbGlrZSBrZXlkb3duIGFuZCBwYXN0ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIHJlc2l6ZShlbGVtLCBkZWxheSkge1xuXHQvLyBJZiBrZXlkb3duLyBwYXN0ZSBldmVudHMgYXJlIHVzZWQgaW5zdGVhZCBvZiBhbiBpbnB1dCBldmVudCwgbWVhc3VyaW5nXG5cdC8vIG9mIGlucHV0IHNjcm9sbEhlaWdodCBuZWVkcyB0byBiZSBkZWxheWVkIHVudGlsIHRoZSB0ZXh0IGNvbnRlbnQgaGFzIGNoYW5nZWQuXG5cdGlmIChkZWxheSkge1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXNpemUoZWxlbSk7XG5cdFx0fSwgMCk7XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRlbGVtLnN0eWxlLm92ZXJmbG93WSA9ICdoaWRkZW4nO1xuXG5cdHZhciBzdHlsZSAgICAgICAgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtLCBudWxsKSxcblx0XHRpc05lYXJCb3R0b20gPSB1dGlsLmlzVGV4dGFyZWFOZWFyQm90dG9tKGVsZW0sIHN0eWxlKSxcblx0XHRvbGRIZWlnaHQgICAgPSBzdHlsZS5oZWlnaHQsXG5cdFx0Y2hhbmdlO1xuXG5cdGVsZW0uc3R5bGUuaGVpZ2h0ID0gJyc7XG5cdGVsZW0uc3R5bGUuaGVpZ2h0ID0gZWxlbS5zY3JvbGxIZWlnaHQgKyB1dGlsLmdldEhlaWdodE9mZnNldChzdHlsZSkgKyAncHgnO1xuXG5cdGNoYW5nZSAgICAgICAgICAgICAgID0gZ2V0SGVpZ2h0Q2hhbmdlKG9sZEhlaWdodCwgc3R5bGUuaGVpZ2h0KTtcblx0ZWxlbS5zdHlsZS5vdmVyZmxvd1kgPSAnJztcblxuXHRpZiAoY2hhbmdlKSB7XG5cdFx0dXRpbC5lbWl0Q3VzdG9tRXZlbnQoZWxlbSwgJ2ZsZXhmaWVsZC5yZXNpemUnLCB7Y2hhbmdlVHlwZTogY2hhbmdlfSk7XG5cblx0XHQvLyBJZiBmaXJzdCB0cmlnZ2VyIGNhdXNlZCB2ZXJ0aWNhbCBzY3JvbGxiYXIgdG8gYmUgZGlzcGxheWVkLFxuXHRcdC8vIGJvZHkgd2lkdGggc2hyaW5rcyBpbiBzb21lIGJyb3dzZXJzIGFuZCBzb21lIGlucHV0cyBtYXkgbmVlZFxuXHRcdC8vIHRvIGJlIHNpemVkIGFnYWluLiBSZS10cmlnZ2VyLlxuXHRcdGlmICh1dGlsLmJvZHlXaWR0aENoYW5nZWQoKSkge1xuXHRcdFx0cmVzaXplQWxsKCk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKGlzTmVhckJvdHRvbSkge1xuXHRcdHV0aWwuc2Nyb2xsVG9Cb3R0b20oZWxlbSk7XG5cdH1cbn1cblxuXG4vKipcbiAqIE1hbnVhbGx5IHRyaWdnZXIgYWxsIGZsZXhmaWVsZCBpbnB1dHMgdG8gcmVzaXplLlxuICpcbiAqIFVzZWZ1bCBpbiBjZXJ0YWluIHNpdHVhdGlvbnMsIHN1Y2ggYXMgb24gYXBwIGluaXQsXG4gKiBhbmQgb24gd2luZG93IHJlc2l6ZSwgd2hlbiB0aGUgc2l6ZSBvZiBhbGwgZWxlbWVudHMgbWF5IGNoYW5nZS5cbiAqXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIHJlc2l6ZUFsbCgpIHtcblx0Ly8gY2xhc3NOYW1lIGlzIHNldCBvbiB0aGlzIGZ1bmN0aW9uIG9uIGluaXQgY2FsbCwgYW5kIHVzZWQgYXMgc2VsZWN0b3Jcblx0dmFyIGVsZW1zICAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUocmVzaXplQWxsLmNsYXNzTmFtZSksXG5cdFx0ZGVsYXlBY3Rpb25zID0gZXZlbnRzTGlzdCgpLmRlbGF5QWN0aW9ucztcblxuXHRBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGVsZW1zLCBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdHJlc2l6ZShlbGVtLCBkZWxheUFjdGlvbnMpO1xuXHR9KTtcblxuXHQvLyBJZiBmaXJzdCB0cmlnZ2VyIGNhdXNlZCB2ZXJ0aWNhbCBzY3JvbGxiYXIgdG8gYmUgZGlzcGxheWVkLFxuXHQvLyBib2R5IHdpZHRoIHNocmlua3MgaW4gc29tZSBicm93c2VycyBhbmQgc29tZSBpbnB1dHMgbWF5IG5lZWRcblx0Ly8gdG8gYmUgc2l6ZWQgYWdhaW4uIFJlLXRyaWdnZXIuXG5cdGlmICh1dGlsLmJvZHlXaWR0aENoYW5nZWQoKSkge1xuXHRcdHJlc2l6ZUFsbCgpO1xuXHR9XG59XG5cblxuLyoqXG4gKiBTZXQgdGhlIGNsYXNzbmFtZSB0aGF0IHNob3VsZCBiZSB1c2VkIGJ5IHRoZSByZXNpemVBbGwgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIGNsYXNzTmFtZSB7U3RyaW5nfVxuICovXG5yZXNpemVBbGwuc2V0U2VsZWN0b3IgPSBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG5cdHJlc2l6ZUFsbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRldmVudHNMaXN0OiBldmVudHNMaXN0LFxuXHRyZXNpemU6ICAgICByZXNpemUsXG5cdHJlc2l6ZUFsbDogIHJlc2l6ZUFsbFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBFbWl0IGEgY3VzdG9tIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlbGVtIHtFbGVtZW50fVxuICogQHBhcmFtIGV2ZW50TmFtZSB7U3RyaW5nfVxuICogQHBhcmFtIGRldGFpbCB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBlbWl0Q3VzdG9tRXZlbnQoZWxlbSwgZXZlbnROYW1lLCBkZXRhaWwpIHtcblx0dmFyIGV2ZW50LFxuXHRcdG9wdGlvbnMgPSB7YnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiBkZXRhaWx9O1xuXG5cdGlmICh3aW5kb3cuQ3VzdG9tRXZlbnQpIHtcblx0XHRpZiAoZGV0YWlsKSBvcHRpb25zLmRldGFpbCA9IGRldGFpbDtcblx0XHRldmVudCA9IG5ldyBDdXN0b21FdmVudChldmVudE5hbWUsIG9wdGlvbnMpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIElFXG5cdFx0ZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnQ3VzdG9tRXZlbnQnKTtcblx0XHRldmVudC5pbml0Q3VzdG9tRXZlbnQoZXZlbnROYW1lLCBvcHRpb25zLmJ1YmJsZXMsIG9wdGlvbnMuY2FuY2VsYWJsZSwgb3B0aW9ucy5kZXRhaWwpO1xuXHR9XG5cblx0ZWxlbS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuXG4vKipcbiAqIEFwcGx5IGFuIGV2ZW50IGxpc3RlbmVyIHRvIGFuIGVsZW1lbnQuXG4gKiBQYXNzIG9wdGlvbmFsIGRlbGVnYXRlQ2xhc3MgcGFyYW1ldGVyIHRvIGRlbGVnYXRlIHRoZSBldmVudC5cbiAqXG4gKiBAcGFyYW0gZWxlbSB7RWxlbWVudCwgRG9jdW1lbnQsIFdpbmRvd31cbiAqIEBwYXJhbSBldmVudHMge0FycmF5fVxuICogQHBhcmFtIGNiIHtGdW5jdGlvbn1cbiAqIEBwYXJhbSBbZGVsZWdhdGVDbGFzc10ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXZlbnRMaXN0ZW5lcihlbGVtLCBldmVudHMsIGNiLCBkZWxlZ2F0ZUNsYXNzKSB7XG5cblx0dmFyIGZ1bmMgPSBjYjtcblxuXHQvLyBJZiBkZWZpbmVkLCBleGVjdXRlIGZ1bmN0aW9uIG9ubHkgd2hlbiB0YXJnZXQgaGFzIGRlbGVnYXRlIGNsYXNzXG5cdGlmICh0eXBlb2YgZGVsZWdhdGVDbGFzcyA9PT0gJ3N0cmluZycpIHtcblx0XHRmdW5jID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGlmIChoYXNDbGFzcyhlLnRhcmdldCwgZGVsZWdhdGVDbGFzcykpIHtcblx0XHRcdFx0Y2IuY2FsbChlLnRhcmdldCwgZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0ZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBmdW5jLCBmYWxzZSk7XG5cdH0pO1xuXG59XG5cblxuLyoqXG4gKiBDaGVjayB0aGF0IGFuIGVsZW1lbnQgaGFzIGEgY2xhc3MuXG4gKiBCYXNlZCBvbiBqUXVlcnkgMS4xMi4wIGhhc0NsYXNzIGltcGxlbWVudGF0aW9uXG4gKlxuICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG4gKiBAcGFyYW0gY2xhc3NOYW1lIHtTdHJpbmd9XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaGFzQ2xhc3MoZWxlbSwgY2xhc3NOYW1lKSB7XG5cdGNsYXNzTmFtZSA9ICcgJyArIGNsYXNzTmFtZSArICcgJztcblx0cmV0dXJuICgnICcgKyBlbGVtLmNsYXNzTmFtZSArICcgJykucmVwbGFjZSgvW1xcdFxcclxcblxcZl0vZywgJyAnKS5pbmRleE9mKGNsYXNzTmFtZSkgIT09IC0xO1xufVxuXG5cbi8qKlxuICogSGFzIHRoZSBib2R5IGVsZW1lbnQgd2lkdGggY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoaXMgZnVuY3Rpb24gd2FzIGNhbGxlZD9cbiAqXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gYm9keVdpZHRoQ2hhbmdlZCgpIHtcblx0dmFyIHdpZHRoICAgICAgPSBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoLFxuXHRcdGhhc0NoYW5nZWQgPSB3aWR0aCAhPT0gYm9keVdpZHRoQ2hhbmdlZC5sYXN0V2lkdGg7XG5cblx0Ym9keVdpZHRoQ2hhbmdlZC5sYXN0V2lkdGggPSB3aWR0aDtcblxuXHRyZXR1cm4gaGFzQ2hhbmdlZDtcbn1cbmJvZHlXaWR0aENoYW5nZWQubGFzdFdpZHRoID0gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcblxuXG4vKipcbiAqIElzIHRoZSBicm93c2VyIEludGVybmV0IEV4cGxvcmVyIDk/XG4gKiBJRTkgaXMgYSBzcGVjaWFsIGNhc2UgYXMgaXQgaGFzIHRoZSBvbmlucHV0IGV2ZW50LCBidXQgaXQgYmVoYXZlcyBkaWZmZXJlbnRseSB0b1xuICogbW9kZXJuIGJyb3dzZXIgaW1wbGVtZW50YXRpb25zLlxuICpcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0llOSgpIHtcblx0cmV0dXJuIG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTVNJRSA5JykgIT09IC0xO1xufVxuXG5cbi8qKlxuICogU3VtcyBhIGxpc3Qgb2YgbnVtZXJpYyB2YWx1ZXMuXG4gKiBAcGFyYW0gey4uLihOdW1iZXJ8U3RyaW5nKX1cbiAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIHN1bUZsb2F0cygpIHtcblx0cmV0dXJuIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UuY2FsbChhcmd1bWVudHMsIGZ1bmN0aW9uIChwcmV2LCBjdXJyZW50KSB7XG5cdFx0cmV0dXJuIHByZXYgKyBwYXJzZUZsb2F0KGN1cnJlbnQpO1xuXHR9LCAwKVxufVxuXG5cbi8qKlxuICogU2Nyb2xsIHRvIHRoZSBib3R0b20gb2YgYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0gZWxlbSB7RWxlbWVudH1cbiAqIEByZXR1cm5zIHtFbGVtZW50fVxuICovXG5mdW5jdGlvbiBzY3JvbGxUb0JvdHRvbShlbGVtKSB7XG5cdGVsZW0uc2Nyb2xsVG9wID0gZWxlbS5zY3JvbGxIZWlnaHQ7XG5cdHJldHVybiBlbGVtO1xufVxuXG5cbi8qKlxuICogSXMgdGhlIGlubmVyIHNjcm9sbCBvZiB0aGUgdGV4dGFyZWFzIGNsb3NlIHRvIHRoZSBib3R0b20/XG4gKiBUYWtlcyBpbnRvIGFjY291bnQgY3Vyc29yIHBvc2l0aW9uLlxuICpcbiAqIEBwYXJhbSBlbGVtIHtIVE1MVGV4dEFyZWFFbGVtZW50fVxuICogQHBhcmFtIFtzdHlsZV0ge0NTU1N0eWxlRGVjbGFyYXRpb259XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUZXh0YXJlYU5lYXJCb3R0b20oZWxlbSwgc3R5bGUpIHtcblxuXHRzdHlsZSA9IHN0eWxlIHx8IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0sIG51bGwpO1xuXG5cdHZhciBpc1Njcm9sbGVkTmVhckJvdHRvbSA9IGVsZW0uc2Nyb2xsVG9wICsgZWxlbS5jbGllbnRIZWlnaHQgPiBlbGVtLnNjcm9sbEhlaWdodCAtIChwYXJzZUZsb2F0KHN0eWxlLmxpbmVIZWlnaHQpICogMiksXG5cdFx0aXNUeXBpbmdOZWFyQm90dG9tICAgPSBlbGVtLnNlbGVjdGlvblN0YXJ0ID4gZWxlbS52YWx1ZS5sZW5ndGggLSA0MDtcblxuXHRyZXR1cm4gaXNTY3JvbGxlZE5lYXJCb3R0b20gJiYgaXNUeXBpbmdOZWFyQm90dG9tO1xufVxuXG5cbi8qKlxuICogU2V0dGluZyBhbiBlbGVtZW50J3MgaGVpZ2h0IGluIENTUyBpcyBjb21wbGljYXRlZCBieSB0aGUgZmFjdCB0aGF0XG4gKiBkaWZmZXJlbnQgaGVpZ2h0IHZhbHVlcyBuZWVkIHRvIGJlIGFwcGxpZWQgZGVwZW5kaW5nIG9uIHRoZSBlbGVtZW50J3NcbiAqIGJveC1zaXppbmcgdmFsdWUuIENhbGN1bGF0ZSB0aGUgb2Zmc2V0IG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0gY29tcHV0ZWRTdHlsZSB7Q1NTU3R5bGVEZWNsYXJhdGlvbn1cbiAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldEhlaWdodE9mZnNldChjb21wdXRlZFN0eWxlKSB7XG5cdGlmIChjb21wdXRlZFN0eWxlLmJveFNpemluZyA9PT0gJ2JvcmRlci1ib3gnKSB7XG5cdFx0cmV0dXJuIHN1bUZsb2F0cyhjb21wdXRlZFN0eWxlLmJvcmRlclRvcFdpZHRoLCBjb21wdXRlZFN0eWxlLmJvcmRlckJvdHRvbVdpZHRoKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gLXN1bUZsb2F0cyhjb21wdXRlZFN0eWxlLnBhZGRpbmdUb3AsIGNvbXB1dGVkU3R5bGUucGFkZGluZ0JvdHRvbSk7XG5cdH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0ZW1pdEN1c3RvbUV2ZW50OiAgICAgIGVtaXRDdXN0b21FdmVudCxcblx0ZXZlbnRMaXN0ZW5lcjogICAgICAgIGV2ZW50TGlzdGVuZXIsXG5cdGJvZHlXaWR0aENoYW5nZWQ6ICAgICBib2R5V2lkdGhDaGFuZ2VkLFxuXHRoYXNDbGFzczogICAgICAgICAgICAgaGFzQ2xhc3MsXG5cdGlzSWU5OiAgICAgICAgICAgICAgICBpc0llOSxcblx0aXNUZXh0YXJlYU5lYXJCb3R0b206IGlzVGV4dGFyZWFOZWFyQm90dG9tLFxuXHRzY3JvbGxUb0JvdHRvbTogICAgICAgc2Nyb2xsVG9Cb3R0b20sXG5cdGdldEhlaWdodE9mZnNldDogICAgICBnZXRIZWlnaHRPZmZzZXRcbn07XG4iXX0=
