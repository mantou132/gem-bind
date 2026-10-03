import { addMicrotask } from '@mantou/gem';
import { DuoyunVisibleBaseElement } from 'duoyun-ui/elements/base/visible';
import { hotkeys } from 'duoyun-ui/lib/hotkeys';
import { theme } from 'duoyun-ui/lib/theme';
import mermaid, { type MermaidConfig } from 'mermaid';

import { repairMermaidRenderSource } from './repair';

import './types';
import 'duoyun-ui/elements/gesture';

export * from 'mermaid';
export { default as mermaid } from 'mermaid';

export { repairMermaidSource } from './repair';

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RenderState = {
  source: string;
  svg?: SVGSVGElement;
  bindFunctions?: (element: Element) => void;
  isZoomed?: boolean;
  error?: boolean;
};

const style = css`
  :host {
    position: relative;
    display: block;
    box-sizing: border-box;
    height: 300px;
    margin: 0.5rem 0;
    max-width: 100%;
    border: 1px solid ${theme.borderColor};
    border-radius: 8px;
    background: ${theme.backgroundColor};
    overflow: auto;
    padding: 0.75rem;
    scrollbar-width: thin;
  }

  :host(:state(loading)) {
    cursor: progress;
  }

  .source {
    margin: 0;
    font-family: ${theme.codeFont};
    font-size: 0.875em;
    white-space: pre-wrap;
    color: ${theme.describeColor};
  }

  :host(:focus-visible) {
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }

  dy-gesture,
  svg {
    height: 100%;
  }

  svg {
    display: block;
    width: 100%;
    margin: auto;
    max-width: none !important;
    cursor: grab;
  }

  dy-gesture:state(grabbing) svg {
    cursor: grabbing;
  }

  .controls {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    display: flex;
    overflow: hidden;
    border: 1px solid ${theme.borderColor};
    border-radius: 6px;
    background: color-mix(in srgb, ${theme.backgroundColor} 92%, transparent);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.16);
  }

  .control {
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    cursor: pointer;
    place-items: center;
    border: 0;
    border-right: 1px solid ${theme.borderColor};
    background: transparent;
    color: ${theme.textColor};
    font: inherit;
    line-height: 1;
  }

  .control:last-child {
    border-right: 0;
  }

  .control:hover {
    background: ${theme.hoverBackgroundColor};
  }

  .control:focus-visible {
    position: relative;
    outline: 2px solid ${theme.focusColor};
    outline-offset: -2px;
  }
`;

let diagramId = 0;
let mermaidQueue = Promise.resolve();
const maxZoom = 8;

const renderMermaid = <T>(task: () => Promise<T>) => {
  const result = mermaidQueue.then(task, task);
  mermaidQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const parseSvg = (source: string) => {
  // Parse as HTML: htmlLabels emit HTML (e.g. `<br>`) inside foreignObject, which is not well-formed XML.
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const parsedSvg = doc.querySelector('svg');
  if (!parsedSvg) throw new Error('Mermaid returned invalid SVG');
  return document.importNode(parsedSvg, true);
};

// `light dark` follows the system preference.
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = (colorScheme: string) => colorScheme === 'dark' || (colorScheme.includes('dark') && darkQuery.matches);

const getViewBox = (svg?: SVGSVGElement): ViewBox | undefined => {
  const viewBox = svg?.viewBox.baseVal;
  if (!viewBox?.width || !viewBox.height) return;
  return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
};

const restoreSankeyLabels = (svg: SVGSVGElement, replacements?: Map<string, string>) => {
  if (!replacements?.size) return;

  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    let text = node.nodeValue || '';
    for (const [token, value] of replacements) text = text.replaceAll(token, value);
    node.nodeValue = text;
  }
};

/** Renders the element's text content as an interactive Mermaid diagram. */
@customElement('gem-bind-mermaid')
@adoptedStyle(style)
@shadow()
export class GemBindMermaidElement extends DuoyunVisibleBaseElement {
  /** Mermaid initialize options. */
  @property config?: MermaidConfig;

  /** Additional stylesheet adopted by the element's shadow root. */
  @property mdStyle?: CSSStyleSheet;

  /** Disable zoom and reset controls. */
  @boolattribute noControls: boolean;

  @state loading: boolean;

  /** Set when the source fails to render; the raw source is shown instead. */
  @state error: boolean;

  #state = createState<RenderState>({ source: '', isZoomed: false });
  #gestureRef = createRef<HTMLElement>();
  #observer = new MutationObserver(() => addMicrotask(this.#generateSvg));
  #rendering = false;
  #rerender = false;
  #renderedConfig?: MermaidConfig;
  #renderedDark?: boolean;
  #initialViewBox?: ViewBox;

  get #source() {
    return this.textContent?.trim() || '';
  }

  #setViewBox = (viewBox: ViewBox) => {
    if (!this.#state.svg || !this.#initialViewBox) return;
    const initial = this.#initialViewBox;
    const width = Math.min(initial.width, viewBox.width);
    const height = Math.min(initial.height, viewBox.height);
    const next = {
      x: Math.min(initial.x + initial.width - width, Math.max(initial.x, viewBox.x)),
      y: Math.min(initial.y + initial.height - height, Math.max(initial.y, viewBox.y)),
      width,
      height,
    };
    this.#state.svg.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`);
    const isZoomed = initial.width - width > 0.01;
    if (this.#state.isZoomed !== isZoomed) {
      this.#state({ isZoomed });
    }
  };

  #zoom = (factor: number, clientX?: number, clientY?: number) => {
    if (!this.#state.svg || !this.#initialViewBox) return;
    const initial = this.#initialViewBox;
    const current = getViewBox(this.#state.svg);
    if (!current) return;
    const scale = initial.width / current.width;
    const nextScale = Math.min(maxZoom, Math.max(1, scale * factor));
    const width = initial.width / nextScale;
    const height = initial.height / nextScale;
    const matrix = this.#state.svg.getScreenCTM();
    const point =
      matrix && clientX !== undefined && clientY !== undefined
        ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
        : undefined;
    const ratioX = point ? (point.x - current.x) / current.width : 0.5;
    const ratioY = point ? (point.y - current.y) / current.height : 0.5;
    this.#setViewBox({
      x: current.x + ratioX * (current.width - width),
      y: current.y + ratioY * (current.height - height),
      width,
      height,
    });
  };

  #resetView = () => {
    if (this.#initialViewBox) this.#setViewBox(this.#initialViewBox);
  };

  #zoomIn = () => this.#zoom(1.25);
  #zoomOut = () => this.#zoom(0.8);

  #panBy = (ratioX: number, ratioY: number) => {
    const viewBox = getViewBox(this.#state.svg);
    if (!viewBox || !this.#state.isZoomed) return;
    this.#setViewBox({
      ...viewBox,
      x: viewBox.x + ratioX * viewBox.width,
      y: viewBox.y + ratioY * viewBox.height,
    });
  };

  #onWheel = (event: WheelEvent) => {
    if (!this.#state.svg || !event.composedPath().includes(this.#state.svg)) return;
    event.preventDefault();
    this.#zoom(Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
  };

  #onPan = ({ detail }: CustomEvent<import('duoyun-ui/elements/gesture').PanEventDetail>) => {
    if (!this.#state.svg || !this.#state.isZoomed) return;
    const viewBox = getViewBox(this.#state.svg);
    if (!viewBox) return;
    const matrix = this.#state.svg.getScreenCTM()?.inverse();
    if (!matrix) return;
    this.#setViewBox({
      ...viewBox,
      x: viewBox.x - (matrix.a * detail.x + matrix.c * detail.y),
      y: viewBox.y - (matrix.b * detail.x + matrix.d * detail.y),
    });
  };

  #onPinch = ({ detail }: CustomEvent<import('duoyun-ui/elements/gesture').PinchEventDetail>) => {
    if (Number.isFinite(detail.scale) && detail.scale > 0) this.#zoom(detail.scale, detail.x, detail.y);
  };

  #hotkeyHandler = hotkeys({
    '=, shift+=, add': this.#zoomIn,
    '-, subtract': this.#zoomOut,
    '0': this.#resetView,
    left: () => this.#panBy(-0.1, 0),
    right: () => this.#panBy(0.1, 0),
    up: () => this.#panBy(0, -0.1),
    down: () => this.#panBy(0, 0.1),
  });

  #onKeydown = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== this) return;
    this.#hotkeyHandler(event);
  };

  #onDblClick = (event: MouseEvent) => {
    if (
      !this.#state.svg ||
      event.composedPath().some((el) => el instanceof Element && el.classList.contains('controls'))
    )
      return;
    event.preventDefault();
    this.#resetView();
  };

  @mounted()
  #observeSource = () => {
    this.#observer.observe(this, { characterData: true, childList: true, subtree: true });
    this.addEventListener('wheel', this.#onWheel, { passive: false });
    this.addEventListener('keydown', this.#onKeydown);
    this.addEventListener('dblclick', this.#onDblClick);
    this.addEventListener('show', this.#generateSvg);
    darkQuery.addEventListener('change', this.#generateSvg);
    return () => {
      this.#observer.disconnect();
      this.removeEventListener('wheel', this.#onWheel);
      this.removeEventListener('keydown', this.#onKeydown);
      this.removeEventListener('dblclick', this.#onDblClick);
      this.removeEventListener('show', this.#generateSvg);
      darkQuery.removeEventListener('change', this.#generateSvg);
    };
  };

  @effect((i) => [i.mdStyle])
  #adoptCustomStyle = () => {
    if (!this.mdStyle) return;
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = [...sheets, this.mdStyle];
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  @effect((i) => [i.config])
  #generateSvg = async () => {
    if (!this.visible) return;
    if (this.#rendering) {
      this.#rerender = true;
      return;
    }

    const source = this.#source;
    const requestedConfig = this.config;
    const dark = isDark(getComputedStyle(this).colorScheme);
    const isCurrent = () => source === this.#source && requestedConfig === this.config;
    if (source === this.#state.source && requestedConfig === this.#renderedConfig && dark === this.#renderedDark) {
      return;
    }

    const commit = (state: Partial<RenderState>) => {
      this.#renderedConfig = requestedConfig;
      this.#renderedDark = dark;
      this.error = !!state.error;
      this.#state({ source, svg: undefined, bindFunctions: undefined, isZoomed: false, error: false, ...state });
    };

    if (!source) {
      this.#initialViewBox = undefined;
      this.loading = false;
      commit({});
      return;
    }

    this.#rendering = true;
    this.#rerender = false;
    this.loading = true;

    try {
      const config = { theme: dark ? 'dark' : 'default', ...requestedConfig } satisfies MermaidConfig;

      let sankeyReplacements: Map<string, string> | undefined;
      const { svg, bindFunctions } = await renderMermaid(async () => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          ...config,
        });

        try {
          return await mermaid.render(`gem-bind-mermaid-${++diagramId}`, source);
        } catch (error) {
          const repair = repairMermaidRenderSource(source);
          if (repair.source === source) throw error;
          console.warn('Mermaid source repaired:', { source, repaired: repair.source });
          sankeyReplacements = repair.replacements;
          return mermaid.render(`gem-bind-mermaid-${++diagramId}`, repair.source);
        }
      });

      if (!this.isConnected || !isCurrent()) return;

      const svgElement = parseSvg(svg);
      restoreSankeyLabels(svgElement, sankeyReplacements);
      this.#initialViewBox = getViewBox(svgElement);
      commit({ svg: svgElement, bindFunctions });
    } catch (error) {
      console.error('Mermaid render failed:', error);
      if (!this.isConnected || !isCurrent()) return;
      this.#initialViewBox = undefined;
      commit({ error: true });
    } finally {
      this.#rendering = false;
      this.loading = false;
      if (this.isConnected && (this.#rerender || !isCurrent())) addMicrotask(this.#generateSvg);
    }
  };

  @effect((i) => [i.#state.svg])
  #bindMermaid = () => {
    const { source, svg, bindFunctions } = this.#state;
    if (!svg || source !== this.#source) return;

    const gesture = this.#gestureRef.value;
    if (!gesture) return;
    bindFunctions?.(gesture);
  };

  render = () => {
    const { svg, error, source } = this.#state;
    if (error) return html`<pre class="source">${source}</pre>`;

    return html`
      <dy-gesture
        ${this.#gestureRef}
        touch-action=${this.#state.isZoomed ? 'none' : 'pan-y'}
        @pan=${this.#onPan}
        @pinch=${this.#onPinch}
      >${svg}</dy-gesture>
      <div v-if=${!!svg && !this.noControls} class="controls">
        <button type="button" class="control" aria-label="Zoom out" title="Zoom out" @click=${this.#zoomOut}>
          −
        </button>
        <button type="button" class="control" aria-label="Reset view" title="Reset view" @click=${this.#resetView}>
          ↺
        </button>
        <button type="button" class="control" aria-label="Zoom in" title="Zoom in" @click=${this.#zoomIn}>
          +
        </button>
      </div>
    `;
  };
}
