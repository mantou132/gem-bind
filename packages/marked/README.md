# @gem-bind/marked

Render markdown with a `<gem-bind-marked>` web component, powered by [marked](https://marked.js.org/).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/marked"></script>
<gem-bind-marked># Hello *world*</gem-bind-marked>
```

Content is re-rendered automatically when the light DOM changes.

## Streaming

Use the `streaming` attribute while appending Markdown. Newly rendered text fades in, and active fades keep their progress when the growing Markdown token is re-rendered:

```html
<gem-bind-marked streaming streaming-duration="600">Generating **an answer</gem-bind-marked>
```

`streaming-duration` configures the fade duration in milliseconds and defaults to `400`. The animation respects `prefers-reduced-motion`.

## Custom rendering

Pass [marked extensions](https://marked.js.org/using_pro#extensions) via the `extensions` property to customize how links, code blocks, etc. are rendered:

```js
const el = document.querySelector('gem-bind-marked');
el.extensions = [
  {
    renderer: {
      // open links in a new tab
      link(token) {
        const text = this.parser.parseInline(token.tokens);
        return `<a href="${token.href}" target="_blank" rel="noopener">${text}</a>`;
      },
      code({ text, lang }) {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return `<pre><code class="language-${lang ?? ''}">${escaped}</code></pre>`;
      },
    },
  },
];
```

## Styling

Shadow DOM styles can be injected via the `mdStyle` property (`CSSStyleSheet`):

```js
const style = new CSSStyleSheet();
style.replaceSync('h1 { color: red; }');
el.mdStyle = style;
```
