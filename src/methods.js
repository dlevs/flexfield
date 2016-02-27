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
			eventsList.cache = eventsList.cache.concat(['keydown', 'cut', 'paste']);
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

	change = getHeightChange(oldHeight, style.height);
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
