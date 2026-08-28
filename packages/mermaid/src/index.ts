import { theme } from 'duoyun-ui/lib/theme';
import mermaid, { type MermaidConfig } from 'mermaid';

import 'duoyun-ui/elements/gesture';
import './types';

export * from 'mermaid';
export { default as mermaid } from 'mermaid';

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
const maxZoom = 8;

const parseSvg = (source: string) => {
  const template = document.createElement('template');
  template.innerHTML = source;
  return template.content.querySelector<SVGSVGElement>('svg') || undefined;
};

const getViewBox = (svg?: SVGSVGElement): ViewBox | undefined => {
  const viewBox = svg?.viewBox.baseVal;
  if (!viewBox?.width || !viewBox.height) return;
  return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
};

/** Renders the element's text content as an interactive Mermaid diagram. */
@customElement('gem-bind-mermaid')
@adoptedStyle(style)
@shadow()
export class GemBindMermaidElement extends GemElement {
  /** Mermaid initialize options. */
  @property config?: MermaidConfig;

  /** Additional stylesheet adopted by the element's shadow root. */
  @property mdStyle?: CSSStyleSheet;

  @state loading: boolean;

  #state = createState<RenderState>({ source: '' });
  #gestureRef = createRef<HTMLElement>();
  #observer = new MutationObserver(() => this.#generateSvg());
  #renderSequence = 0;
  #svg?: SVGSVGElement;
  #initialViewBox?: ViewBox;

  #setViewBox = (viewBox: ViewBox) => {
    if (!this.#svg || !this.#initialViewBox) return;
    const initial = this.#initialViewBox;
    const width = Math.min(initial.width, viewBox.width);
    const height = Math.min(initial.height, viewBox.height);
    const next = {
      x: Math.min(initial.x + initial.width - width, Math.max(initial.x, viewBox.x)),
      y: Math.min(initial.y + initial.height - height, Math.max(initial.y, viewBox.y)),
      width,
      height,
    };
    this.#svg.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`);
  };

  #zoom = (factor: number, clientX?: number, clientY?: number) => {
    if (!this.#svg || !this.#initialViewBox) return;
    const initial = this.#initialViewBox;
    const current = getViewBox(this.#svg);
    if (!current) return;
    const scale = initial.width / current.width;
    const nextScale = Math.min(maxZoom, Math.max(1, scale * factor));
    const width = initial.width / nextScale;
    const height = initial.height / nextScale;
    const rect = this.#svg.getBoundingClientRect();
    const ratioX = clientX === undefined || !rect.width ? 0.5 : (clientX - rect.left) / rect.width;
    const ratioY = clientY === undefined || !rect.height ? 0.5 : (clientY - rect.top) / rect.height;
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

  #onWheel = (event: WheelEvent) => {
    if (!this.#svg || !event.composedPath().includes(this.#svg)) return;
    event.preventDefault();
    this.#zoom(Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
  };

  #onPan = ({ detail }: CustomEvent<import('duoyun-ui/elements/gesture').PanEventDetail>) => {
    if (!this.#svg) return;
    const viewBox = getViewBox(this.#svg);
    if (!viewBox) return;
    const rect = this.#svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.#setViewBox({
      ...viewBox,
      x: viewBox.x - (detail.x * viewBox.width) / rect.width,
      y: viewBox.y - (detail.y * viewBox.height) / rect.height,
    });
  };

  #onPinch = ({ detail }: CustomEvent<import('duoyun-ui/elements/gesture').PinchEventDetail>) => {
    if (Number.isFinite(detail.scale) && detail.scale > 0) this.#zoom(detail.scale, detail.x, detail.y);
  };

  #onKeydown = (event: KeyboardEvent) => {
    const viewBox = getViewBox(this.#svg);
    if (event.composedPath()[0] !== this || !viewBox) return;
    if (event.key === '+' || event.key === '=') this.#zoom(1.25);
    else if (event.key === '-') this.#zoom(0.8);
    else if (event.key === '0') this.#resetView();
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const x = event.key === 'ArrowLeft' ? -0.1 : event.key === 'ArrowRight' ? 0.1 : 0;
      const y = event.key === 'ArrowUp' ? -0.1 : event.key === 'ArrowDown' ? 0.1 : 0;
      this.#setViewBox({
        ...viewBox,
        x: viewBox.x + x * viewBox.width,
        y: viewBox.y + y * viewBox.height,
      });
    } else return;
    event.preventDefault();
  };

  @mounted()
  #observeSource = () => {
    this.#observer.observe(this, { characterData: true, childList: true, subtree: true });
    this.addEventListener('wheel', this.#onWheel, { passive: false });
    this.addEventListener('keydown', this.#onKeydown);
    return () => {
      this.#observer.disconnect();
      this.#renderSequence += 1;
      this.removeEventListener('wheel', this.#onWheel);
      this.removeEventListener('keydown', this.#onKeydown);
    };
  };

  @effect((i) => [i.mdStyle])
  #adoptCustomStyle = () => {
    if (!this.mdStyle) return;
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = [...sheets, this.mdStyle];
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  #renderSvg = async (source: string, sequence: number, config: MermaidConfig) => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        ...config,
      });
      const { svg, bindFunctions } = await mermaid.render(`gem-bind-mermaid-${++diagramId}`, source);
      if (sequence !== this.#renderSequence) return;
      const svgElement = parseSvg(svg);
      this.#svg = svgElement;
      this.#initialViewBox = getViewBox(svgElement);
      this.#state({ source, svg: svgElement, bindFunctions });
    } catch {
      if (sequence !== this.#renderSequence) return;
      this.#state({ source, svg: undefined, bindFunctions: undefined });
    } finally {
      if (sequence === this.#renderSequence) this.loading = false;
    }
  };

  @effect((i) => [i.config])
  #generateSvg = () => {
    this.#svg = undefined;
    this.#initialViewBox = undefined;
    const source = this.textContent.trim();
    const sequence = ++this.#renderSequence;
    this.loading = Boolean(source);
    this.#state({ source, svg: undefined, bindFunctions: undefined });
    if (!source) return;

    const themeName = getComputedStyle(this).colorScheme === 'dark' ? 'dark' : 'default';
    void this.#renderSvg(source, sequence, { theme: themeName, ...this.config });
  };

  @effect()
  #bindMermaid = () => {
    const { source, svg, bindFunctions } = this.#state;
    if (!svg || source !== this.textContent.trim()) return;

    const gesture = this.#gestureRef.value;
    if (!gesture) return;
    bindFunctions?.(gesture);
  };

  render = () => {
    const svg = this.#state.source === this.textContent.trim() ? this.#state.svg : undefined;

    return html`
      <dy-gesture ${this.#gestureRef} @pan=${this.#onPan} @pinch=${this.#onPinch}>${svg}</dy-gesture>
      <div v-if=${svg} class="controls">
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
