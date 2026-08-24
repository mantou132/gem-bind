# @gem-bind/diff2html

Render unified diffs as HTML with a `<gem-bind-diff2html>` web component, powered by [diff2html](https://diff2html.xyz/).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/diff2html"></script>

<gem-bind-diff2html>
diff --git a/hello.ts b/hello.ts
index 1c2d3e4..5f6a7b8 100644
--- a/hello.ts
+++ b/hello.ts
@@ -1,3 +1,3 @@
-console.log('hello');
+console.log('world');
</gem-bind-diff2html>
```

The diff text is read from the element's light DOM and re-rendered automatically when it changes.

Code lines are syntax highlighted per file (detected from the diff filenames) with [highlight.js](https://highlightjs.org/); word diff tags are preserved during highlighting.

## Attributes

All [diff2html configuration options](https://diff2html.xyz/api#important-classes) are exposed as attributes:

| Attribute | Type | Default |
| --- | --- | --- |
| `outputFormat` | `'line-by-line' \| 'side-by-side'` | `'line-by-line'` |
| `drawFileList` | `boolean` | `false` |
| `srcPrefix` / `dstPrefix` | `string` | — |
| `matching` | `'lines' \| 'words' \| 'none'` | `'none'` |
| `diffStyle` | `'word' \| 'char'` | `'word'` |
| `diffMaxChanges` / `diffMaxLineLength` | `number` | — |
| `noHighlight` | `boolean` | `false` |

Plus the remaining tuning options: `matchWordsThreshold`, `maxLineLengthHighlight`, `renderNothingWhenEmpty`, `matchingMaxComparisons`, `maxLineSizeInBlockForComparison`.

## Styling

Stylesheets are fetched once and shared across all instances:

- diff2html's stylesheet always loads;
- a highlight.js theme (`github` or `github-dark`, picked by `colorScheme`) loads only when highlighting is enabled;
- extra styles can be injected via the `mdStyle` property (`CSSStyleSheet`).
