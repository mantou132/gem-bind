# @gem-bind/flow

Lay out directed graphs with the `<gem-bind-flow>` web component, powered by
[ELK](https://www.eclipse.org/elk/).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/flow"></script>
<gem-bind-flow></gem-bind-flow>
```

```ts
import '@gem-bind/flow';

document.querySelector('gem-bind-flow').graph = {
  id: 'root',
  children: [
    { id: 'n1', data: 'Node 1' },
    { id: 'n2', data: 'Node 2' },
    { id: 'n3', data: 'Node 3' },
  ],
  edges: [
    { id: 'e1', sources: ['n1'], targets: ['n2'] },
    { id: 'e2', sources: ['n1'], targets: ['n3'] },
  ],
};
```

Use `layout` for ELK layout options and the `renderNode`, `renderNodeLabel`, `renderEdge`, `renderEdgeLabel`,
and `renderEndMarker` properties to customize rendering. The package exports both `GemBindFlowElement` and
`GemBindFlowCanvasElement` together with their graph types.
