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
