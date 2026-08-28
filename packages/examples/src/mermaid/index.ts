import type { MermaidConfig } from '@gem-bind/mermaid';
import { html, render } from '@mantou/gem';

import '@gem-bind/mermaid';
import '../elements/layout';

const config: MermaidConfig = {
  theme: 'default',
  flowchart: { curve: 'basis' },
};

const definition = `
flowchart LR
  A[Diagram text] --> B{Mermaid}
  B -->|Success| C[SVG]
  B -->|Edit| A
`;

render(
  html`
    <gem-examples-layout>
      <gem-bind-mermaid .config=${config}>${definition}</gem-bind-mermaid>
    </gem-examples-layout>
  `,
  document.body,
);
