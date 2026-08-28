# @gem-bind/latex

Render LaTeX with the `<gem-bind-latex>` web component, powered by [KaTeX](https://katex.org/).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/latex"></script>

Inline: <gem-bind-latex>E = mc^2</gem-bind-latex>

<gem-bind-latex block tabindex="0">\int_0^1 x^2\,dx = \frac{1}{3}</gem-bind-latex>
```

Changing the light-DOM text automatically renders the expression again. The element emits MathML, so it does not
require KaTeX's global stylesheet or webfonts.

## API

| Name      | Kind      | Type            | Description                                      |
| --------- | --------- | --------------- | ------------------------------------------------ |
| `block`   | attribute | `boolean`       | Render as display math                           |
| `options` | property  | `KatexOptions`  | KaTeX render options                             |
| `mdStyle` | property  | `CSSStyleSheet` | Additional stylesheet adopted by the shadow root |

The package re-exports KaTeX and its types.
