import { html, render } from '@mantou/gem';

import '@gem-bind/latex';
import '../elements/layout';

render(
  html`
    <gem-examples-layout>
      <p>Euler's identity: <gem-bind-latex>e^{i\pi} + 1 = 0</gem-bind-latex></p>
      <gem-bind-latex block tabindex="0">\int_0^1 x^2\,dx = \frac{1}{3}</gem-bind-latex>
    </gem-examples-layout>
  `,
  document.body,
);
