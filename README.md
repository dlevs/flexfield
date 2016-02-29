# Flexfield

A standalone JavaScript plugin to automatically resize a textarea field as the user types.

[Demo](http://dlevs.com/flexfield)

## Getting Started

### Installing

#### Browser

Simply load the script on the page and initialise the plugin.

``` html
<textarea class="js-flexfield">foo</textarea>
<textarea class="js-flexfield">bar</textarea>

<script src="flexfield.min.js"></script>
<script>flexfield.init();</script>
```

#### npm

Alternatively, require Flexfield as part of a project and avoid polluting the global scope.

Install via npm:

```
npm i flexfield
```

Then require:

``` js
require('flexfield').init();
```

## Styling
### Recommended Styling
For smooth performance, the following styles are recommended:
``` css
.js-flexfield {
    overflow: hidden;
    vertical-align: top; /* Prevents a flicker on IE9 */
    resize: none; /* Makes little sense when field height is being set automatically */
}
```

### Minimum Height
For a single-row textarea that resembles a generic input field, set line-height, min-height and height to be equal:
``` css
.js-flexfield {
    font-size: 16px;
    line-height: 18px;
    min-height: 18px;
    height: 18px;
}
```
The above example assumes that the box-sizing property is set to the default "content-box". For border-box examples, see [demo](http://dlevs.com/flexfield).

## Methods
### flexfield.init(className)

Initialise the plugin.

This applies the event listeners to the document. An optional className can be supplied to target instead of the default "js-flexfield".

### flexfield.trigger(element)

The single call to flexfield.init() already applies the necessary event listeners to resize all textareas on user interaction. However, when creating a new textarea element, or changing the value of a textarea dynamically with JavaScript, a resize must be triggered manually:


``` js
var elem = document.getElementById('main-input');
elem.value = 'Something else';
flexfield.trigger(elem);
```

## Events

### flexfield-resize
Fired when a field's height changes. Event.detail.change is a string value describing the type of change.

A jQuery example:
``` js
$(document).on('flexfield-resize', '.js-flexfield', function (e) {
    var change  = e.originalEvent.detail.change, // 'grow' or 'shrink'
        height  = $(this).height();

    alert(change + ' to ' + height + 'px'); // eg "grow to 45px"
});
```


## Why?

Flexfield has a few advantages over similar plugins:

* Simplicity
* No dependencies
* Makes uses of event delegation so it does not need to be initialised for every element. Because of this, textarea elements can be added or removed dynamically, without having to worry about memory leaks or calling <span class="code">.destroy()</span> methods.
* Textarea height is calculated from the element's <span class="code">scrollHeight</span> property, so there is no need for a "shadow element", which can lead to glitches caused by mismatched styling.
* Unobtrusive - the plugin only changes the textarea's height and overflow, allowing everything else to be defined with CSS.
* Self-contained - no prototype pollution.

## Compatability
Works in all modern browsers. IE9 and greater.


## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details
