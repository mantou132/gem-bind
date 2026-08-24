import { html, render } from '@mantou/gem';
import type { MarkedExtension } from 'marked';

import '@gem-bind/marked';
import '../elements/layout';

const style = new CSSStyleSheet();
style.replaceSync('h1 { color: red; }');

const extensions: MarkedExtension[] = [
  {
    renderer: {
      // open links in a new tab
      link(token) {
        const text = this.parser.parseInline(token.tokens);
        return `<a href="${token.href}" target="_blank" rel="noopener">${text}</a>`;
      },
      code({ text, lang }) {
        return `<pre><code class="language-${lang ?? ''}">${text}</code></pre>`;
      },
    },
  },
];

const md = `
# Marked in the browser

Rendered by **marked**. A [link](https://github.com/mantou132/gem-bind) and some code:

\`\`\`ts
console.log('hello');
\`\`\`
`;

render(
  html`
    <gem-examples-layout>
      <gem-bind-marked .mdStyle=${style} .extensions=${extensions}>${md}</gem-bind-marked>
    </gem-examples-layout>
  `,
  document.body,
);
