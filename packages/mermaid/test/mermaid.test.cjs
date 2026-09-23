const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function compile(name) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}
const repairExports = {};
vm.runInNewContext(compile('repair.ts'), { exports: repairExports });
const { repairMermaidSource, repairMermaidRenderSource } = repairExports;

// Exercise the actual component methods with deferred Mermaid renders and a small DOM adapter.
// Browser layout itself is not simulated; screen matrices are supplied explicitly.
function setup(render) {
  const svg = {
    viewBox: { baseVal: { x: 0, y: 0, width: 1200, height: 200 } },
    matrix: { a: 2, b: 0, c: 0, d: 2, e: 0, f: -200 },
    getScreenCTM() {
      return { inverse: () => this.matrix };
    },
    setAttribute(name, value) {
      assert.equal(name, 'viewBox');
      const [x, y, width, height] = value.split(' ').map(Number);
      this.viewBox.baseVal = { x, y, width, height };
    },
  };
  class Base {
    visible = true;
    isConnected = true;
    textContent = 'flowchart LR\nA --> B';
    effects = new Map();
    listeners = new Map();
    addEventListener(name, fn) {
      this.listeners.set(name, fn);
    }
    removeEventListener(name) {
      this.listeners.delete(name);
    }
  }
  const lifecycle = () => (_value, context) => {
    context.addInitializer(function () {
      this.effects.set(context.name, context.access.get(this));
    });
  };
  const noop = () => {};
  const configs = [];
  const mermaid = { initialize: (config) => configs.push(config), render };
  const exports = {};
  vm.runInNewContext(compile('index.ts'), {
    exports,
    require(name) {
      if (name === 'mermaid') return { __esModule: true, default: mermaid };
      if (name === './repair') return repairExports;
      if (name === '@mantou/gem') return { addMicrotask: queueMicrotask };
      if (name.endsWith('/base/visible')) return { DuoyunVisibleBaseElement: Base };
      if (name.endsWith('/hotkeys')) return { hotkeys: () => noop };
      if (name.endsWith('/theme')) return { theme: {} };
      if (name === './types' || name.endsWith('/gesture')) return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    css: noop,
    html: (_strings, ...values) => values,
    customElement: () => noop,
    adoptedStyle: () => noop,
    shadow: () => noop,
    property: noop,
    boolattribute: noop,
    state: noop,
    effect: lifecycle,
    mounted: lifecycle,
    createState: (initial) => {
      const state = Object.assign((update) => Object.assign(state, update), initial);
      return state;
    },
    createRef: () => ({}),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    getComputedStyle: () => ({ colorScheme: 'light' }),
    DOMParser: class {
      parseFromString() {
        return { querySelector: (name) => (name === 'svg' ? svg : null) };
      }
    },
    document: { importNode: (node) => node },
    DOMPoint: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
      matrixTransform(m) {
        return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f };
      }
    },
    console,
  });
  return { Element: exports.GemBindMermaidElement, svg, configs };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const generate = (element) => element.effects.get('#generateSvg')();

test('Sankey preserves shared nodes and avoids collisions with source IDs', () => {
  const { source, replacements } = repairMermaidRenderSource('sankey-beta\n甲,乙,10\n乙,MMDU0MMD,10');
  const [, first, second] = source.split('\n');
  assert.equal(first.split(',')[1], second.split(',')[0]);
  assert.equal(second.split(',')[1], 'MMDU0MMD');
  assert.equal(replacements.get(first.split(',')[0]), '甲');
  assert.equal(replacements.get(first.split(',')[1]), '乙');
  assert.equal(replacements.size, 2);
});

test('public Sankey repair preserves readable labels', () => {
  assert.equal(repairMermaidSource('sankey-beta\n甲，乙，10'), 'sankey-beta\n甲,乙,10');
});

test('flowchart repair respects target strings, quoted pipes and multiple edges', () => {
  assert.equal(
    repairMermaidSource('flowchart LR\nA -->|foo(bar)| B["a|b"] -->|next| C'),
    'flowchart LR\nA -->|"foo(bar)"| B["a|b"] -->|"next"| C',
  );
  const quoted = 'flowchart LR\nA -->|"a|b"| B["-->|not an edge|"]';
  assert.equal(repairMermaidSource(quoted), quoted);
  const other = 'sequenceDiagram\nA->>B: -->|foo(bar)|';
  assert.equal(repairMermaidSource(other), other);
});

test('config changed during rendering is rendered again instead of cached as complete', async () => {
  const pending = [];
  const { Element, configs, svg } = setup(() => new Promise((resolve) => pending.push(resolve)));
  const element = new Element();
  element.config = { theme: 'default' };
  const first = generate(element);
  await flush();
  element.config = { theme: 'dark' };
  await generate(element);
  pending.shift()({ svg: '<svg />' });
  await first;
  await flush();
  assert.deepEqual(
    configs.map((config) => config.theme),
    ['default', 'dark'],
  );
  assert.equal(element.render().includes(svg), false);
  pending.shift()({ svg: '<svg />' });
  await flush();
  await generate(element);
  assert.equal(configs.length, 2);
});

test('source changed during rendering discards stale output and renders latest text', async () => {
  const pending = [],
    sources = [];
  const { Element, svg } = setup((_id, source) => {
    sources.push(source);
    return new Promise((resolve) => pending.push(resolve));
  });
  const element = new Element();
  const first = generate(element);
  await flush();
  element.textContent = 'flowchart LR\nB --> C';
  await generate(element);
  pending.shift()({ svg: '<svg />' });
  await first;
  await flush();
  assert.equal(element.render().includes(svg), false);
  assert.deepEqual(sources, ['flowchart LR\nA --> B', element.textContent]);
  pending.shift()({ svg: '<svg />' });
  await flush();
  assert.equal(element.render().includes(svg), true);
});

test('zoom anchor and drag use screen-to-SVG coordinates including letterboxing', async () => {
  const { Element, svg } = setup(async () => ({ svg: '<svg />' }));
  const element = new Element();
  element.effects.get('#observeSource')();
  await generate(element);
  element.listeners.get('wheel')({
    composedPath: () => [svg],
    preventDefault() {},
    deltaY: -Math.log(2) / 0.002,
    clientX: 300,
    clientY: 125,
  });
  assert.deepEqual(svg.viewBox.baseVal, { x: 300, y: 25, width: 600, height: 100 });
  svg.matrix = { a: 1, b: 0, c: 0, d: 1, e: 300, f: -75 };
  const pan = element.render()[2];
  pan({ detail: { x: 10, y: 10 } });
  assert.deepEqual(svg.viewBox.baseVal, { x: 290, y: 15, width: 600, height: 100 });
});
