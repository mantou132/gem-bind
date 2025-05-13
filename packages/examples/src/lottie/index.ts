import { html, render } from '@mantou/gem';

import '@gem-bind/lottie';
import '../elements/layout';

const style = new CSSStyleSheet();
style.replaceSync('h1 { color: red; }');

render(
  html`
    <gem-examples-layout>
      <gem-bind-lottie src="https://000035970.codepen.website/data.json" loop autoplay></gem-bind-lottie>
    </gem-examples-layout>
  `,
  document.body,
);
