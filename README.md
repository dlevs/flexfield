# Flexfield

A standalone JavaScript plugin to automatically resize a textarea field as the user types.

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
    vertical-align: top; /* IE9 likes this */
    overflow-x: hidden;
    resize: none;
}
```

### Minimum Height
For a single-row textarea that resembles a generic input field, set line-height, min-height and height to be equal:
``` css
.js-flexfield {
    font-size: 14px;
    line-height: 15px;
    min-height: 15px;
    height: 15px;
}
```

## Methods
### flexfield.init(className)

Initialise the plugin.

This applies the event listeners to the document. An optional className can be supplied to target instead of the default "js-flexfield".

### flexfield.trigger(element)

The single call to flexfield.init() already applies the necessary event listeners to resize all textareas on user interaction. However, when creating a new textarea element, or changing the value of a textarea dynamically with JavaScript, the first resize must be triggered manually:


``` js
var elem = document.getElementById('main-input');
elem.value = 'Something else';
flexfield.trigger(elem);
```

The same result can be achieved by firing the "flexfield" event on the element. With jQuery, it would look like this:

``` js
$('#main-input')
    .val('Something else')
    .trigger('flexfield');
```

## Why?

Flexfield has a few advantages over similar plugins:

* Simplicity
* No dependencies
* Makes uses of event delegation so it does not need to be initialised for every element. Because of this, textarea elements can be added or removed dynamically, without having to worry about memory leaks or calling <span class="code">.destroy()</span> methods.
* Textarea height is calculated from the element's <span class="code">scrollHeight</span> property, so there is no need for a "shadow element", which can lead to glitches caused by mismatched styling.
* Unobtrusive - the plugin only changes the textarea's height, allowing everything else to be defined with CSS.
* Fires events when fields have grown or shrunk.
* Self-contained - no prototype pollution.

## Compatability
Works in all modern browsers. IE9 and greater.


## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details
