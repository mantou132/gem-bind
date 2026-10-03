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

Changing the light-DOM text automatically renders the diagram again. The element has a default height of `300px` and only renders when entering the viewport.

## Properties

| Property     | Type            | Description                                      |
| ------------ | --------------- | ------------------------------------------------ |
| `config`     | `MermaidConfig` | Mermaid initialize options                       |
| `mdStyle`    | `CSSStyleSheet` | Additional stylesheet adopted by the shadow root |
| `noControls` | `boolean`       | Hide zoom and reset control buttons              |

`startOnLoad` defaults to `false`, `securityLevel` to `strict`, and `suppressErrorRendering` to `true`. Values passed
through `config` can override these defaults.

Without `config.theme`, the `dark` theme is used when the element's `color-scheme` is `dark`, or `light dark` with a dark
system preference; the diagram re-renders when the system preference changes.

## States

| State     | Description                                                   |
| --------- | ------------------------------------------------------------- |
| `loading` | A render is in progress                                       |
| `error`   | The source failed to render; the raw source is shown instead |

## Navigation

- Drag or use arrow keys to move the diagram after zooming.
- Pinch, use the mouse wheel, or press `+`/`-` to zoom between 1x and 8x.
- Press `0` or use the reset button to restore the initial view.

The package re-exports Mermaid and its types.

## Source repair

If rendering fails, the component retries with limited repairs for flowchart edge labels, requirement diagrams,
quadrant charts, and Sankey CSV. Sankey rendering also handles non-ASCII labels while preserving shared nodes.

The exported `repairMermaidSource(source)` performs text-only repairs and preserves readable labels. It does not
expose the temporary identifiers used internally to render non-ASCII Sankey labels.
