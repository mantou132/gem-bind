import type { GemBindMarkedElement, MarkedExtension } from '@gem-bind/marked';
import { html, render } from '@mantou/gem';

import '@gem-bind/marked';
import '../elements/layout';

const markdownStyle = new CSSStyleSheet();
markdownStyle.replaceSync(`
  :host {
    color: #172033;
  }
  h1,
  h2,
  h3 {
    letter-spacing: -0.025em;
  }
  h1 {
    color: #2457d6;
  }
  pre {
    overflow: auto;
    border: 1px solid #d7deeb;
    border-radius: 0.4rem;
    padding: 0.9rem;
    background: #f6f8fc;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  blockquote {
    margin-inline: 0;
    border-inline-start: 3px solid #2457d6;
    padding-inline-start: 1rem;
    color: #536078;
  }
`);

const traceStyle = new CSSStyleSheet();
const updateTraceStyle = (highlight: boolean) => {
  traceStyle.replaceSync(`
    :host {
      color: #172033;
      line-height: 1.65;
    }
    h1,
    h2,
    h3 {
      margin-block: 1.2em 0.45em;
      letter-spacing: -0.025em;
    }
    h1:first-child,
    h2:first-child,
    h3:first-child {
      margin-block-start: 0;
    }
    a {
      color: #2457d6;
      text-underline-offset: 0.18em;
    }
    code {
      border-radius: 0.25rem;
      padding: 0.08em 0.3em;
      background: #edf1f8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9em;
    }
    pre {
      overflow: auto;
      border: 1px solid #d7deeb;
      border-radius: 0.45rem;
      padding: 0.9rem;
      background: #f4f6fa;
    }
    pre code {
      padding: 0;
      background: none;
    }
    blockquote {
      margin-inline: 0;
      border-inline-start: 3px solid #ff6b35;
      padding-inline-start: 1rem;
      color: #536078;
    }
    table {
      border-collapse: collapse;
    }
    th,
    td {
      border: 1px solid #d7deeb;
      padding: 0.35rem 0.65rem;
    }
    stream-probe {
      display: block;
      margin-block: 0.75rem;
      border: 1px dashed #8b98ad;
      padding: 0.65rem;
    }
    ${
      highlight
        ? `
          [data-stream-range] {
            border-radius: 0.15em;
            background: rgb(255 107 53 / 24%);
            box-shadow: inset 0 -2px #ff6b35;
          }
        `
        : ''
    }
  `);
};
updateTraceStyle(true);

const pageStyle = new CSSStyleSheet();
pageStyle.replaceSync(`
  :root {
    color-scheme: light;
    --trace-ink: #172033;
    --trace-muted: #68748a;
    --trace-line: #d7deeb;
    --trace-panel: #ffffff;
    --trace-canvas: #eef2f8;
    --trace-signal: #2457d6;
    --trace-pulse: #ff6b35;
    --trace-ok: #18794e;
  }

  .trace-bench {
    box-sizing: border-box;
    width: min(1180px, 100%);
    margin-inline: auto;
    color: var(--trace-ink);
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .trace-hero {
    position: relative;
    overflow: hidden;
    border: 1px solid #bfc9da;
    padding: clamp(1.4rem, 4vw, 3rem);
    background: #e8edf6;
  }

  .trace-hero::after {
    position: absolute;
    inset: 0 0 0 auto;
    width: 0.45rem;
    background: var(--trace-pulse);
    content: "";
  }

  .trace-eyebrow,
  .panel-label,
  .field > span,
  .metric dt,
  .trace-legend,
  .source-meta {
    color: var(--trace-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .trace-eyebrow {
    margin: 0 0 0.8rem;
    color: var(--trace-signal);
  }

  .trace-hero h1 {
    max-width: 15ch;
    margin: 0;
    font-family: "Avenir Next Condensed", "Arial Narrow", ui-sans-serif, sans-serif;
    font-size: clamp(2.5rem, 7vw, 5.8rem);
    font-stretch: condensed;
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 0.88;
  }

  .trace-hero-copy {
    max-width: 66ch;
    margin: 1.25rem 0 0;
    color: #46536a;
    font-size: 1rem;
    line-height: 1.65;
  }

  .trace-strip {
    position: relative;
    height: 0.65rem;
    margin-top: 2rem;
    border: 1px solid #aeb9cc;
    background: #f8faff;
  }

  .trace-strip-fill {
    width: var(--trace-progress, 0%);
    height: 100%;
    background: var(--trace-signal);
    transition: width 120ms linear;
  }

  .trace-strip-cursor {
    position: absolute;
    top: 50%;
    left: var(--trace-progress, 0%);
    width: 0.75rem;
    height: 1.4rem;
    border: 2px solid #f8faff;
    background: var(--trace-pulse);
    box-shadow: 0 0 0 1px var(--trace-pulse);
    transform: translate(-50%, -50%);
    transition: left 120ms linear;
  }

  .trace-status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: center;
    margin-top: 0.85rem;
    color: var(--trace-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }

  .status-chip {
    border: 1px solid currentColor;
    padding: 0.25rem 0.55rem;
    color: var(--trace-signal);
    background: #f8faff;
    font-weight: 700;
  }

  .status-chip[data-state="streaming"] {
    color: #b54708;
  }

  .status-chip[data-state="complete"] {
    color: var(--trace-ok);
  }

  .motion-note {
    margin: 1rem 0 0;
    border-inline-start: 3px solid var(--trace-pulse);
    padding-inline-start: 0.8rem;
    color: #7a3218;
  }

  .control-panel {
    display: grid;
    grid-template-columns: minmax(14rem, 1.7fr) repeat(3, minmax(9rem, 1fr));
    gap: 1rem;
    margin-top: 1rem;
    border: 1px solid var(--trace-line);
    padding: 1rem;
    background: var(--trace-panel);
  }

  .field {
    display: grid;
    gap: 0.45rem;
    align-content: start;
  }

  .field select,
  .field input[type="range"] {
    width: 100%;
  }

  .field select {
    box-sizing: border-box;
    min-height: 2.35rem;
    border: 1px solid #aeb9cc;
    border-radius: 0;
    padding-inline: 0.65rem;
    color: var(--trace-ink);
    background: #f8faff;
    font: inherit;
  }

  .field-output {
    color: var(--trace-signal);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
  }

  .scenario-copy {
    grid-column: 1 / -1;
    margin: -0.15rem 0 0;
    color: var(--trace-muted);
    font-size: 0.9rem;
  }

  .control-actions {
    display: flex;
    flex-wrap: wrap;
    grid-column: 1 / -1;
    gap: 0.55rem;
    align-items: center;
    border-top: 1px solid var(--trace-line);
    padding-top: 1rem;
  }

  .trace-button {
    min-height: 2.45rem;
    border: 1px solid #9ca9be;
    border-radius: 0;
    padding: 0.55rem 0.85rem;
    color: var(--trace-ink);
    background: #f8faff;
    font: 700 0.82rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    cursor: pointer;
  }

  .trace-button:hover {
    border-color: var(--trace-signal);
    color: var(--trace-signal);
  }

  .trace-button--primary {
    border-color: var(--trace-signal);
    color: white;
    background: var(--trace-signal);
  }

  .trace-button--primary:hover {
    color: white;
    background: #1947b8;
  }

  .trace-button:focus-visible,
  .field select:focus-visible,
  .field input:focus-visible,
  .toggle input:focus-visible + span {
    outline: 3px solid rgb(36 87 214 / 28%);
    outline-offset: 2px;
  }

  .toggle {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    color: #46536a;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .toggle input {
    width: 1rem;
    height: 1rem;
    accent-color: var(--trace-signal);
  }

  .trace-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(17rem, 0.34fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .trace-panel {
    min-width: 0;
    border: 1px solid var(--trace-line);
    background: var(--trace-panel);
  }

  .panel-head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--trace-line);
    padding: 0.75rem 1rem;
  }

  .panel-head h2 {
    margin: 0;
    font-size: 1rem;
  }

  .stream-output {
    display: block;
    box-sizing: border-box;
    min-height: 28rem;
    max-height: min(62vh, 42rem);
    overflow: auto;
    padding: clamp(1rem, 3vw, 2rem);
    overscroll-behavior: contain;
  }

  .trace-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    border-top: 1px solid var(--trace-line);
    padding: 0.7rem 1rem;
  }

  .legend-swatch {
    display: inline-block;
    width: 0.9rem;
    height: 0.65rem;
    margin-inline-end: 0.35rem;
    vertical-align: -0.05rem;
    background: rgb(255 107 53 / 32%);
    box-shadow: inset 0 -2px var(--trace-pulse);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
  }

  .metric {
    min-height: 5.4rem;
    border-bottom: 1px solid var(--trace-line);
    padding: 0.9rem;
  }

  .metric:nth-child(odd) {
    border-inline-end: 1px solid var(--trace-line);
  }

  .metric dd {
    margin: 0.35rem 0 0;
    color: var(--trace-ink);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.35rem;
    font-weight: 750;
  }

  .metric[data-alert="true"] dd {
    color: #c4320a;
  }

  .expectations {
    display: grid;
    gap: 0.7rem;
    margin: 0;
    padding: 1rem 1rem 1.1rem 2.2rem;
    color: #536078;
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .expectations strong {
    color: var(--trace-ink);
  }

  .source-panel,
  .static-panel {
    margin-top: 1rem;
  }

  .source-view {
    box-sizing: border-box;
    min-height: 10rem;
    max-height: 19rem;
    overflow: auto;
    margin: 0;
    padding: 1rem;
    color: #dce6fb;
    background: #172033;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 0.78rem/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .static-panel details {
    padding: 0;
  }

  .static-panel summary {
    padding: 1rem;
    font-weight: 700;
    cursor: pointer;
  }

  .static-output {
    display: block;
    border-top: 1px solid var(--trace-line);
    padding: 1.25rem;
  }

  @media (max-width: 900px) {
    .control-panel,
    .trace-workspace {
      grid-template-columns: 1fr 1fr;
    }
    .field--scenario,
    .scenario-copy,
    .control-actions,
    .render-panel,
    .diagnostic-panel {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
    .trace-hero,
    .control-panel {
      margin-inline: -1rem;
    }
    .control-panel {
      grid-template-columns: 1fr;
    }
    .field--scenario,
    .scenario-copy,
    .control-actions {
      grid-column: 1;
    }
    .stream-output {
      min-height: 22rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .trace-strip-fill,
    .trace-strip-cursor {
      transition: none;
    }
  }
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageStyle];

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

const staticMarkdown = `
# Static rendering

The same component also supports [Marked extensions](https://marked.js.org/using_pro#extensions), **inline markup**, and fenced code:

\`\`\`ts
console.log('hello from @gem-bind/marked');
\`\`\`
`;

const stablePrefix = Array.from(
  { length: 80 },
  (_, index) =>
    `Stable paragraph ${String(index + 1).padStart(2, '0')}. Its DOM node should be reused while only the live tail changes.`,
).join('\n\n');

const scenarios = {
  boundaries: {
    label: 'Syntax transitions',
    description:
      'Closes emphasis, links, lists, a table, and a code fence while the current token is repeatedly rebuilt.',
    initial: '',
    streamed: `# Streaming state lab

This paragraph grows one grapheme at a time. Existing words should keep their fade progress instead of flashing again.

## Inline boundaries

Text becomes **bold**, then *italic*, then [a link](https://github.com/mantou132/gem-bind), followed by \`inline code\`.

> A blockquote arrives in pieces and remains readable throughout the transition.

- First list item
- Second item with **nested emphasis**
- Third item closes the list

| Signal | Expected result |
| --- | --- |
| Stable blocks | Reused |
| Current block | Rebuilt |

\`\`\`ts
const state = {
  streaming: true,
  cache: 'current tokens only',
};
\`\`\`
`,
  },
  stable: {
    label: 'Stable prefix · 80 paragraphs',
    description:
      'Preloads a long stable document, then streams one final section. Reused blocks should remain near 80.',
    initial: `# Long document cache probe

${stablePrefix}

`,
    streamed: `## Live tail

Only this final paragraph should be rebuilt while these words arrive. Watch “reused blocks” stay high and “rebuilt blocks” stay at one.
`,
  },
  exclusions: {
    label: 'Excluded DOM boundaries',
    description:
      'Streams raw style, SVG, MathML, form controls, and a custom element. “Boundary leaks” must stay at zero.',
    initial: `# Exclusion probe

Normal Markdown text should receive the orange active-range trace. The raw elements below must not.

`,
    streamed: `<style>
.exclusion-style-probe { color: rgb(36 87 214); }
</style>

<svg viewBox="0 0 360 42" width="360" role="img" aria-label="SVG exclusion probe">
  <rect width="360" height="42" fill="#e8edf6"></rect>
  <text x="12" y="27" fill="#172033">SVG text must stay untouched</text>
</svg>

<math><mrow><mi>MathML</mi><mo>+</mo><mi>text</mi></mrow></math>

<select aria-label="Select exclusion probe">
  <option>Select and option text must stay untouched</option>
</select>

<textarea aria-label="Textarea exclusion probe">Textarea text must stay untouched</textarea>

<stream-probe class="exclusion-style-probe">Custom-element text must stay untouched.</stream-probe>

## Visible tail

This final Markdown paragraph should animate normally after every excluded boundary.
`,
  },
  cleanup: {
    label: 'Cleanup and rewind',
    description:
      'A short payload makes it easy to pause, step backward, replay, and watch active spans return to zero.',
    initial: '',
    streamed: `# Cleanup probe

Every orange trace is temporary.

After the last chunk, wait for the selected animation duration. Active spans and active animations should both return to zero, with the text unchanged.
`,
  },
} as const;

type ScenarioKey = keyof typeof scenarios;

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const toGraphemes = (value: string) => Array.from(segmenter.segment(value), ({ segment }) => segment);
const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));
const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

render(
  html`
    <gem-examples-layout>
      <main class="trace-bench">
        <header class="trace-hero">
          <p class="trace-eyebrow">@gem-bind/marked · streaming diagnostics</p>
          <h1>Streaming Trace Bench</h1>
          <p class="trace-hero-copy">
            Slow the stream down, highlight live ranges, and verify which rendered blocks keep their DOM identity. The
            page stops after one run so stale animation wrappers and unexpected rebuilds remain visible.
          </p>
          <div id="trace-strip" class="trace-strip" style="--trace-progress: 0%" aria-hidden="true">
            <div class="trace-strip-fill"></div>
            <div class="trace-strip-cursor"></div>
          </div>
          <div class="trace-status-row" aria-live="polite">
            <span id="stream-status" class="status-chip" data-state="ready">Ready</span>
            <span id="progress-label">0 / 0 graphemes</span>
          </div>
          <p id="motion-note" class="motion-note" hidden>
            Reduced motion is enabled at the OS/browser level, so the component intentionally skips streaming spans.
          </p>
        </header>

        <section class="control-panel" aria-label="Streaming controls">
          <label class="field field--scenario">
            <span>Scenario</span>
            <select id="scenario">
              ${Object.entries(scenarios).map(
                ([key, scenario]) => html`<option value=${key}>${scenario.label}</option>`,
              )}
            </select>
          </label>
          <label class="field">
            <span>Chunk size</span>
            <input id="chunk-size" type="range" min="1" max="12" value="3" />
            <output id="chunk-size-output" class="field-output">3 graphemes</output>
          </label>
          <label class="field">
            <span>Chunk interval</span>
            <input id="chunk-interval" type="range" min="20" max="400" step="10" value="70" />
            <output id="chunk-interval-output" class="field-output">70 ms</output>
          </label>
          <label class="field">
            <span>Fade duration</span>
            <input id="fade-duration" type="range" min="100" max="2400" step="50" value="900" />
            <output id="fade-duration-output" class="field-output">900 ms</output>
          </label>
          <p id="scenario-copy" class="scenario-copy"></p>
          <div class="control-actions">
            <button id="play" class="trace-button trace-button--primary" type="button">Play</button>
            <button id="step" class="trace-button" type="button">Append one chunk</button>
            <button id="rewind" class="trace-button" type="button">Rewind one chunk</button>
            <button id="reset" class="trace-button" type="button">Reset</button>
            <label class="toggle">
              <input id="streaming-enabled" type="checkbox" checked />
              <span>Enable streaming animation</span>
            </label>
            <label class="toggle">
              <input id="highlight-ranges" type="checkbox" checked />
              <span>Highlight active ranges</span>
            </label>
            <label class="toggle">
              <input id="follow-tail" type="checkbox" checked />
              <span>Follow the live tail</span>
            </label>
          </div>
        </section>

        <div class="trace-workspace">
          <section class="trace-panel render-panel">
            <header class="panel-head">
              <div>
                <span class="panel-label">Rendered shadow DOM</span>
                <h2>Live output</h2>
              </div>
              <span class="source-meta">Orange = active fade range</span>
            </header>
            <gem-bind-marked
              id="streaming-output"
              class="stream-output"
              streaming
              .mdStyle=${traceStyle}
              .extensions=${extensions}
            ></gem-bind-marked>
            <footer class="trace-legend">
              <span><i class="legend-swatch"></i>active text</span>
              <span>stable text keeps the same span and animation progress</span>
            </footer>
          </section>

          <aside class="trace-panel diagnostic-panel">
            <header class="panel-head">
              <div>
                <span class="panel-label">Reconciliation trace</span>
                <h2>Live diagnostics</h2>
              </div>
            </header>
            <dl class="metrics">
              <div class="metric">
                <dt>Top-level blocks</dt>
                <dd id="block-count">0</dd>
              </div>
              <div class="metric">
                <dt>Reused blocks</dt>
                <dd id="reused-count">0</dd>
              </div>
              <div class="metric">
                <dt>Rebuilt blocks</dt>
                <dd id="rebuilt-count">0</dd>
              </div>
              <div class="metric">
                <dt>To next paint</dt>
                <dd id="paint-time">0 ms</dd>
              </div>
              <div class="metric">
                <dt>Active spans</dt>
                <dd id="span-count">0</dd>
              </div>
              <div class="metric">
                <dt>Active animations</dt>
                <dd id="animation-count">0</dd>
              </div>
              <div id="leak-metric" class="metric">
                <dt>Boundary leaks</dt>
                <dd id="leak-count">0</dd>
              </div>
              <div class="metric">
                <dt>Rendered chars</dt>
                <dd id="character-count">0</dd>
              </div>
            </dl>
            <ol class="expectations">
              <li><strong>Normal stream:</strong> only the current block is rebuilt.</li>
              <li><strong>Active progress:</strong> earlier orange ranges do not flash back to their start.</li>
              <li><strong>After the fade:</strong> spans and animations both return to zero.</li>
              <li><strong>Excluded boundaries:</strong> leaks always remain zero.</li>
            </ol>
          </aside>
        </div>

        <section class="trace-panel source-panel">
          <header class="panel-head">
            <div>
              <span class="panel-label">Light DOM input</span>
              <h2>Current Markdown tail</h2>
            </div>
            <span class="source-meta">Last 1,600 characters</span>
          </header>
          <pre class="source-view"><code id="source-preview"></code></pre>
        </section>

        <section class="trace-panel static-panel">
          <details>
            <summary>Static rendering and extension smoke test</summary>
            <gem-bind-marked class="static-output" .mdStyle=${markdownStyle} .extensions=${extensions}
              >${staticMarkdown}</gem-bind-marked
            >
          </details>
        </section>
      </main>
    </gem-examples-layout>
  `,
  document.body,
);

const getElement = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const streamingElement = getElement<GemBindMarkedElement>('#streaming-output');
const scenarioSelect = getElement<HTMLSelectElement>('#scenario');
const scenarioCopy = getElement<HTMLElement>('#scenario-copy');
const chunkSizeInput = getElement<HTMLInputElement>('#chunk-size');
const chunkSizeOutput = getElement<HTMLOutputElement>('#chunk-size-output');
const intervalInput = getElement<HTMLInputElement>('#chunk-interval');
const intervalOutput = getElement<HTMLOutputElement>('#chunk-interval-output');
const durationInput = getElement<HTMLInputElement>('#fade-duration');
const durationOutput = getElement<HTMLOutputElement>('#fade-duration-output');
const streamingInput = getElement<HTMLInputElement>('#streaming-enabled');
const highlightInput = getElement<HTMLInputElement>('#highlight-ranges');
const followTailInput = getElement<HTMLInputElement>('#follow-tail');
const playButton = getElement<HTMLButtonElement>('#play');
const stepButton = getElement<HTMLButtonElement>('#step');
const rewindButton = getElement<HTMLButtonElement>('#rewind');
const resetButton = getElement<HTMLButtonElement>('#reset');
const statusElement = getElement<HTMLElement>('#stream-status');
const progressLabel = getElement<HTMLElement>('#progress-label');
const traceStrip = getElement<HTMLElement>('#trace-strip');
const sourcePreview = getElement<HTMLElement>('#source-preview');
const blockCount = getElement<HTMLElement>('#block-count');
const reusedCount = getElement<HTMLElement>('#reused-count');
const rebuiltCount = getElement<HTMLElement>('#rebuilt-count');
const paintTime = getElement<HTMLElement>('#paint-time');
const spanCount = getElement<HTMLElement>('#span-count');
const animationCount = getElement<HTMLElement>('#animation-count');
const leakMetric = getElement<HTMLElement>('#leak-metric');
const leakCount = getElement<HTMLElement>('#leak-count');
const characterCount = getElement<HTMLElement>('#character-count');
const motionNote = getElement<HTMLElement>('#motion-note');

const excludedRangeSelector = [
  'style [data-stream-range]',
  'svg [data-stream-range]',
  'math [data-stream-range]',
  'select [data-stream-range]',
  'textarea [data-stream-range]',
  'stream-probe [data-stream-range]',
].join(',');

let streamUnits: string[] = [];
let streamCursor = 0;
let sourceNode = document.createTextNode('');
let running = false;
let runId = 0;

const getScenario = () => scenarios[scenarioSelect.value as ScenarioKey];
const getChunkSize = () => Number(chunkSizeInput.value);
const getDuration = () => Number(durationInput.value);
const getTopLevelBlocks = () =>
  [...streamingElement.shadowRoot!.childNodes].filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);

const setStatus = (label: string, state: 'ready' | 'streaming' | 'complete' = 'ready') => {
  statusElement.textContent = label;
  statusElement.dataset.state = state;
};

const updateProgress = () => {
  const progress = streamUnits.length ? (streamCursor / streamUnits.length) * 100 : 0;
  traceStrip.style.setProperty('--trace-progress', `${progress}%`);
  progressLabel.textContent = `${streamCursor} / ${streamUnits.length} graphemes`;
  const source = sourceNode.data;
  sourcePreview.textContent = source.length > 1600 ? `…${source.slice(-1600)}` : source;
};

const updateLiveDiagnostics = () => {
  const root = streamingElement.shadowRoot!;
  const activeSpans = root.querySelectorAll<HTMLElement>('[data-stream-range]');
  const animations = [...activeSpans].reduce((count, span) => count + span.getAnimations().length, 0);
  const leaks = root.querySelectorAll(excludedRangeSelector).length;
  spanCount.textContent = String(activeSpans.length);
  animationCount.textContent = String(animations);
  leakCount.textContent = String(leaks);
  leakMetric.dataset.alert = String(leaks > 0);
  characterCount.textContent = String(root.textContent?.length || 0);
};

const commitMutation = async (mutate: () => void, currentRun: number) => {
  const before = getTopLevelBlocks();
  const beforeSet = new Set(before);
  const start = performance.now();
  mutate();
  await nextPaint();
  if (currentRun !== runId) return false;
  const after = getTopLevelBlocks();
  const reused = after.filter((node) => beforeSet.has(node)).length;
  blockCount.textContent = String(after.length);
  reusedCount.textContent = String(reused);
  rebuiltCount.textContent = String(after.length - reused);
  paintTime.textContent = `${(performance.now() - start).toFixed(1)} ms`;
  if (followTailInput.checked) streamingElement.scrollTop = streamingElement.scrollHeight;
  updateLiveDiagnostics();
  return true;
};

const syncControlLabels = () => {
  chunkSizeOutput.textContent = `${chunkSizeInput.value} graphemes`;
  intervalOutput.textContent = `${intervalInput.value} ms`;
  durationOutput.textContent = `${durationInput.value} ms`;
};

const syncPlayButton = () => {
  playButton.textContent = running ? 'Pause' : streamCursor === streamUnits.length ? 'Replay' : 'Play';
  playButton.setAttribute('aria-pressed', String(running));
};

const stopPlayback = (label = 'Paused') => {
  running = false;
  runId += 1;
  setStatus(label);
  syncPlayButton();
};

const resetScenario = async () => {
  running = false;
  const currentRun = ++runId;
  setStatus('Preparing baseline');
  const scenario = getScenario();
  streamUnits = toGraphemes(scenario.streamed);
  streamCursor = 0;
  scenarioCopy.textContent = scenario.description;
  streamingElement.streaming = streamingInput.checked;
  streamingElement.streamingDuration = streamingInput.checked && scenario.initial ? 1 : getDuration();
  sourceNode = document.createTextNode(scenario.initial);
  const committed = await commitMutation(() => streamingElement.replaceChildren(sourceNode), currentRun);
  if (!committed) return;
  if (streamingInput.checked && scenario.initial) {
    await wait(10);
    if (currentRun !== runId) return;
    streamingElement.streamingDuration = getDuration();
    await nextPaint();
    if (currentRun !== runId) return;
    updateLiveDiagnostics();
  }
  updateProgress();
  setStatus('Ready');
  syncPlayButton();
};

const appendChunk = async (currentRun: number) => {
  if (streamCursor >= streamUnits.length) return false;
  const nextCursor = Math.min(streamCursor + getChunkSize(), streamUnits.length);
  const chunk = streamUnits.slice(streamCursor, nextCursor).join('');
  const committed = await commitMutation(() => sourceNode.appendData(chunk), currentRun);
  if (!committed) return false;
  streamCursor = nextCursor;
  updateProgress();
  return true;
};

const play = async () => {
  if (running) return;
  if (streamCursor >= streamUnits.length) await resetScenario();
  running = true;
  const currentRun = ++runId;
  setStatus(streamingInput.checked ? 'Streaming' : 'Streaming · animation off', 'streaming');
  syncPlayButton();

  while (currentRun === runId && streamCursor < streamUnits.length) {
    if (!(await appendChunk(currentRun))) return;
    await wait(Number(intervalInput.value));
  }
  if (currentRun !== runId) return;

  running = false;
  setStatus('Waiting for cleanup', 'streaming');
  syncPlayButton();
  await wait(getDuration() + 80);
  if (currentRun !== runId) return;
  updateLiveDiagnostics();
  setStatus('Complete · wrappers cleaned', 'complete');
};

playButton.addEventListener('click', () => {
  if (running) stopPlayback();
  else void play();
});

stepButton.addEventListener('click', () => {
  stopPlayback('Stepping');
  const currentRun = runId;
  void appendChunk(currentRun).then((appended) => {
    if (!appended || currentRun !== runId) return;
    setStatus(streamCursor === streamUnits.length ? 'Last chunk appended' : 'Paused');
    syncPlayButton();
  });
});

rewindButton.addEventListener('click', () => {
  stopPlayback('Rewinding');
  const currentRun = runId;
  const nextCursor = Math.max(0, streamCursor - getChunkSize());
  const nextSource = getScenario().initial + streamUnits.slice(0, nextCursor).join('');
  void commitMutation(() => {
    sourceNode.data = nextSource;
  }, currentRun).then((committed) => {
    if (!committed || currentRun !== runId) return;
    streamCursor = nextCursor;
    updateProgress();
    setStatus('Paused after rewind');
    syncPlayButton();
  });
});

resetButton.addEventListener('click', () => void resetScenario());
scenarioSelect.addEventListener('change', () => void resetScenario());

chunkSizeInput.addEventListener('input', syncControlLabels);
intervalInput.addEventListener('input', syncControlLabels);
durationInput.addEventListener('input', () => {
  syncControlLabels();
  streamingElement.streamingDuration = getDuration();
});

streamingInput.addEventListener('change', () => {
  streamingElement.streaming = streamingInput.checked;
  setStatus(streamingInput.checked ? 'Streaming animation enabled' : 'Streaming animation disabled');
  updateLiveDiagnostics();
});

highlightInput.addEventListener('change', () => updateTraceStyle(highlightInput.checked));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const updateMotionNotice = () => {
  motionNote.hidden = !reducedMotion.matches;
};
reducedMotion.addEventListener('change', updateMotionNotice);
updateMotionNotice();

const diagnosticObserver = new MutationObserver(updateLiveDiagnostics);
diagnosticObserver.observe(streamingElement.shadowRoot!, { childList: true, subtree: true });
window.addEventListener('pagehide', () => diagnosticObserver.disconnect(), { once: true });

syncControlLabels();
void resetScenario().then(() => play());
