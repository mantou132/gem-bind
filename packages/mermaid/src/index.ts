import { addMicrotask } from '@mantou/gem';
import { DuoyunVisibleBaseElement } from 'duoyun-ui/elements/base/visible';
import { hotkeys } from 'duoyun-ui/lib/hotkeys';
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
  isZoomed?: boolean;
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
  const template = document.createElement('template');
  template.innerHTML = source;
  return template.content.querySelector<SVGSVGElement>('svg') || undefined;
};

const getViewBox = (svg?: SVGSVGElement): ViewBox | undefined => {
  const viewBox = svg?.viewBox.baseVal;
  if (!viewBox?.width || !viewBox.height) return;
  return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
};

const quoteMermaidText = (value: string) => {
  const text = value.trim();
  if (!text || (text.startsWith('"') && text.endsWith('"'))) return text;
  return `"${text.replace(/(?<!\\)"/g, '\\"')}"`;
};

const repairRequirementDiagramSource = (source: string) => {
  if (!/^\s*requirementDiagram\b/m.test(source)) return source;

  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;

      const definition = line.match(
        /^(\s*)(requirement|functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint|element)\s+(.+?)\s*\{\s*$/,
      );
      if (definition) {
        const [, indent, type, rawName] = definition;
        const [name, className] = rawName.split(/(?=:::)/, 2);
        return `${indent}${type} ${quoteMermaidText(name)}${className || ''} {`;
      }

      const propertyMatch = line.match(/^(\s*)(id|text|type|docref)\s*:\s*(.*?)\s*$/i);
      if (propertyMatch) {
        const [, indent, key, value] = propertyMatch;
        return `${indent}${key}: ${quoteMermaidText(value)}`;
      }

      const forward = line.match(
        /^(\s*)(.+?)\s+-\s+(contains|copies|derives|satisfies|verifies|refines|traces)\s+->\s+(.+?)\s*$/i,
      );
      if (forward) {
        const [, indent, from, relation, to] = forward;
        return `${indent}${quoteMermaidText(from)} - ${relation} -> ${quoteMermaidText(to)}`;
      }

      const backward = line.match(
        /^(\s*)(.+?)\s+<-\s+(contains|copies|derives|satisfies|verifies|refines|traces)\s+-\s+(.+?)\s*$/i,
      );
      if (backward) {
        const [, indent, to, relation, from] = backward;
        return `${indent}${quoteMermaidText(to)} <- ${relation} - ${quoteMermaidText(from)}`;
      }

      return line;
    })
    .join('\n');
};

const repairQuadrantChartSource = (source: string) => {
  if (!/^\s*quadrantChart\b/m.test(source)) return source;

  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;

      const axis = line.match(/^(\s*)([xy]-axis)\s+(.+?)\s*$/i);
      if (axis) {
        const [, indent, name, text] = axis;
        const parts = text.split(/\s*-->\s*/, 2);
        return `${indent}${name} ${parts.map(quoteMermaidText).join(' --> ')}`;
      }

      const quadrant = line.match(/^(\s*)(quadrant-[1-4])\s+(.+?)\s*$/i);
      if (quadrant) {
        const [, indent, name, text] = quadrant;
        return `${indent}${name} ${quoteMermaidText(text)}`;
      }

      const point = line.match(/^(\s*)(.+?)(:::\w+)?\s*:\s*(\[[^\]]+\].*)$/);
      if (point) {
        const [, indent, label, className = '', rest] = point;
        return `${indent}${quoteMermaidText(label)}${className}: ${rest}`;
      }

      return line;
    })
    .join('\n');
};

type MermaidRepair = {
  source: string;
  replacements?: Map<string, string>;
};

const repairSankeySource = (source: string): MermaidRepair => {
  if (!/^\s*sankey(?:-beta)?\b/m.test(source)) return { source };

  const replacements = new Map<string, string>();
  let index = 0;
  const makeToken = (value: string) => {
    let token = `MMDU${index++}MMD`;
    while (source.includes(token)) token = `MMDU${index++}MMD`;
    replacements.set(token, value);
    return token;
  };

  const repaired = source
    .split('\n')
    .map((line, lineIndex) => {
      if (lineIndex === 0 || !line.trim() || line.trim().startsWith('%%')) return line;

      // LLMs often emit Chinese commas as CSV separators.
      const fullWidthCommas = line.match(/，/g)?.length || 0;
      let next = !line.includes(',') && fullWidthCommas === 2 ? line.replaceAll('，', ',') : line;

      // Mermaid's Sankey lexer only accepts ASCII, even inside quoted CSV fields.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: match non-ascii
      next = next.replace(/[^\x00-\x7F]+/g, makeToken);
      return next;
    })
    .join('\n');

  return { source: repaired, replacements };
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

const repairFlowchartSource = (source: string) => {
  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;

      const arrowRegex = /([-=.~<>ox]+\|)/g;
      let match: RegExpExecArray | null;
      const arrowIndices: Array<{ index: number; length: number; arrow: string }> = [];
      while ((match = arrowRegex.exec(line)) !== null) {
        arrowIndices.push({ index: match.index, length: match[0].length, arrow: match[0] });
      }
      if (arrowIndices.length === 0) return line;

      let result = '';
      let lastEnd = 0;
      for (let i = 0; i < arrowIndices.length; i++) {
        const current = arrowIndices[i];
        result += line.slice(lastEnd, current.index);
        const nextArrowIndex = i + 1 < arrowIndices.length ? arrowIndices[i + 1].index : line.length;
        const segment = line.slice(current.index + current.length, nextArrowIndex);

        const lastPipeIndex = segment.lastIndexOf('|');
        if (lastPipeIndex !== -1) {
          const rawLabel = segment.slice(0, lastPipeIndex);
          const target = segment.slice(lastPipeIndex + 1);
          const trimmedLabel = rawLabel.trim();
          if (trimmedLabel.startsWith('"') && trimmedLabel.endsWith('"')) {
            result += current.arrow + rawLabel + '|' + target;
          } else {
            result += `${current.arrow}${quoteMermaidText(trimmedLabel)}|${target}`;
          }
        } else {
          result += current.arrow + segment;
        }
        lastEnd = nextArrowIndex;
      }
      result += line.slice(lastEnd);
      return result;
    })
    .join('\n');
};

export const repairMermaidSource = (source: string) => {
  if (/^\s*requirementDiagram\b/m.test(source)) return repairRequirementDiagramSource(source);
  if (/^\s*quadrantChart\b/m.test(source)) return repairQuadrantChartSource(source);
  if (/^\s*sankey(?:-beta)?\b/m.test(source)) return repairSankeySource(source).source;
  return repairFlowchartSource(source);
};

const repairMermaidRenderSource = (source: string): MermaidRepair => {
  if (/^\s*sankey(?:-beta)?\b/m.test(source)) return repairSankeySource(source);
  return { source: repairMermaidSource(source) };
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

  #state = createState<RenderState>({ source: '', isZoomed: false });
  #gestureRef = createRef<HTMLElement>();
  #observer = new MutationObserver(() => addMicrotask(this.#generateSvg));
  #rendering = false;
  #rerender = false;
  #renderedConfig?: MermaidConfig;
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
    const isZoomed = initial.width - width > 0.01;
    if (this.#state.isZoomed !== isZoomed) {
      this.#state({ isZoomed });
    }
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

  #panBy = (ratioX: number, ratioY: number) => {
    const viewBox = getViewBox(this.#svg);
    if (!viewBox || !this.#state.isZoomed) return;
    this.#setViewBox({
      ...viewBox,
      x: viewBox.x + ratioX * viewBox.width,
      y: viewBox.y + ratioY * viewBox.height,
    });
  };

  #onWheel = (event: WheelEvent) => {
    if (!this.#svg || !event.composedPath().includes(this.#svg)) return;
    event.preventDefault();
    this.#zoom(Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
  };

  #onPan = ({ detail }: CustomEvent<import('duoyun-ui/elements/gesture').PanEventDetail>) => {
    if (!this.#svg || !this.#state.isZoomed) return;
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
    if (!this.#svg || event.composedPath().some((el) => el instanceof Element && el.classList.contains('controls')))
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
    return () => {
      this.#observer.disconnect();
      this.removeEventListener('wheel', this.#onWheel);
      this.removeEventListener('keydown', this.#onKeydown);
      this.removeEventListener('dblclick', this.#onDblClick);
      this.removeEventListener('show', this.#generateSvg);
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

    const source = this.textContent?.trim() || '';
    if (source === this.#state.source && this.config === this.#renderedConfig) return;

    if (!source) {
      this.#svg = undefined;
      this.#initialViewBox = undefined;
      this.#renderedConfig = this.config;
      this.loading = false;
      this.#state({ source: '', svg: undefined, bindFunctions: undefined, isZoomed: false });
      return;
    }

    this.#rendering = true;
    this.#rerender = false;
    this.loading = true;

    try {
      const config = {
        theme: getComputedStyle(this).colorScheme === 'dark' ? 'dark' : 'default',
        ...this.config,
      } satisfies MermaidConfig;

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

      if (!this.isConnected || source !== this.textContent?.trim()) return;

      const svgElement = parseSvg(svg);
      if (svgElement) restoreSankeyLabels(svgElement, sankeyReplacements);
      this.#svg = svgElement;
      this.#initialViewBox = getViewBox(svgElement);
      this.#renderedConfig = this.config;
      this.#state({ source, svg: svgElement, bindFunctions, isZoomed: false });
    } catch (error) {
      console.error('Mermaid render failed:', error);
    } finally {
      this.#rendering = false;
      this.loading = false;
      if (this.isConnected && (this.#rerender || source !== this.textContent?.trim())) {
        addMicrotask(this.#generateSvg);
      }
    }
  };

  @effect()
  #bindMermaid = () => {
    const { source, svg, bindFunctions } = this.#state;
    if (!svg || source !== this.textContent?.trim()) return;

    const gesture = this.#gestureRef.value;
    if (!gesture) return;
    bindFunctions?.(gesture);
  };

  render = () => {
    const svg = this.#state.svg;

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
