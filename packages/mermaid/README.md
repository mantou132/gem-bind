# @gem-bind/mermaid

Render interactive diagrams from text with the `<gem-bind-mermaid>` web component, powered by
[Mermaid](https://github.com/mermaid-js/mermaid).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/mermaid"></script>

<gem-bind-mermaid tabindex="0">
  flowchart LR
    A[Write diagram] --> B[Render SVG]
</gem-bind-mermaid>
```

Changing the light-DOM text automatically renders the diagram again. The element has a default height of `300px`.

## Properties

| Property  | Type             | Description                                      |
| --------- | ---------------- | ------------------------------------------------ |
| `config`  | `MermaidConfig`  | Mermaid initialize options                       |
| `mdStyle` | `CSSStyleSheet`  | Additional stylesheet adopted by the shadow root |

`startOnLoad` defaults to `false`, `securityLevel` to `strict`, and `suppressErrorRendering` to `true`. Values passed
through `config` can override these defaults.

## Navigation

- Drag or use arrow keys to move the diagram after zooming.
- Pinch, use the mouse wheel, or press `+`/`-` to zoom between 1x and 8x.
- Press `0` or use the reset button to restore the initial view.

The package re-exports Mermaid and its types.
