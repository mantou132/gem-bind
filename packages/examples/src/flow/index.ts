import type { Node } from '@gem-bind/flow';
import { html, render } from '@mantou/gem';

import '@gem-bind/flow';
import '../elements/layout';

const pageStyle = new CSSStyleSheet();
pageStyle.replaceSync(`
  main {
    box-sizing: border-box;
  }
  gem-bind-flow {
    width: 100%;
  }
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageStyle];

const graph: Node = {
  id: 'root',
  children: [
    { id: 'n1', data: 'Node 1' },
    { id: 'n2', data: 'Node 2' },
    { id: 'n3', data: 'Node 3' },
    { id: 'n4', data: 'Node 4' },
    { id: 'n5', data: 'Node 5' },
  ],
  edges: [
    { id: 'e1', sources: ['n1'], targets: ['n2'] },
    { id: 'e2', sources: ['n1'], targets: ['n3'] },
    { id: 'e3', sources: ['n1'], targets: ['n4'] },
    { id: 'e4', sources: ['n4'], targets: ['n5'] },
  ],
};

render(
  html`
    <gem-examples-layout>
      <main>
        <gem-bind-flow .graph=${graph}></gem-bind-flow>
      </main>
    </gem-examples-layout>
  `,
  document.body,
);
