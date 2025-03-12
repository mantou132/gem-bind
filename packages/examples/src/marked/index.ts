import { html, render } from '@mantou/gem';

import '@gem-bind/marked';
import '../elements/layout';

const style = new CSSStyleSheet();
style.replaceSync('h1 { color: red; }');

render(
  html`
    <gem-examples-layout>
      <gem-bind-marked .mdStyle=${style}># Marked in the browser Rendered by **marked**.</gem-bind-marked>
    </gem-examples-layout>
  `,
  document.body,
);
