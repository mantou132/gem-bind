import type { TemplateResult } from '@mantou/gem';
import { blockContainer } from 'duoyun-ui/lib/styles';
import { Marked, type MarkedExtension } from 'marked';

import './types';

export * from 'marked';

const streamKeyframesStyle = css`
  @keyframes stream-enter {
    from {
      opacity: 0.1;
    }
    to {
      opacity: 1;
    }
  }
`;

const style = css({
  streamEnter: styled`
    animation: stream-enter var(--stream-duration) ease-out both;
    animation-delay: var(--stream-delay, 0ms);

    @media (prefers-reduced-motion: reduce) {
      & {
        animation: none;
      }
    }
  `,
});

type FadeRange = {
  id: number;
  start: number;
  end: number;
  startedAt: number;
};

type StreamTextSegment = {
  node: Node;
  start: number;
};

const commonPrefixLength = (left: string, right: string, stablePrefixLength: number) => {
  let index = Math.min(stablePrefixLength, left.length, right.length);
  while (index < left.length && left[index] === right[index]) index += 1;
  return index;
};

const htmlNamespace = 'http://www.w3.org/1999/xhtml';
const excludedStreamElements = new Set([
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'option',
  'plaintext',
  'script',
  'select',
  'style',
  'textarea',
  'title',
  'xmp',
]);

const canAnimateText = (textNode: Text) => {
  if (!textNode.data.trim()) return false;
  let parent = textNode.parentElement;
  while (parent) {
    if (
      parent.namespaceURI !== htmlNamespace ||
      excludedStreamElements.has(parent.localName) ||
      parent.localName.includes('-') ||
      parent.shadowRoot
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
};

const streamEnterSelector = `.${style.streamEnter}`;

const unwrapAnimatedText = (spans: Set<HTMLElement>, normalize = false) => {
  const parents = new Set<Node>();
  for (const span of spans) {
    if (span.isConnected && span.parentNode) {
      parents.add(span.parentNode);
      span.replaceWith(...span.childNodes);
    }
  }
  spans.clear();
  if (normalize) for (const parent of parents) parent.normalize();
};

const getStreamTextSnapshot = (root: ShadowRoot, cache: WeakMap<Node, string>) => {
  const parts: string[] = [];
  const segments: StreamTextSegment[] = [];
  let offset = 0;
  let stablePrefixLength = 0;
  let foundChangedNode = false;

  for (const node of root.childNodes) {
    // Gem's template anchors are comments; ShadowRoot.textContent does not include them.
    if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.ELEMENT_NODE) continue;
    let text: string;
    if (cache.has(node)) {
      text = cache.get(node)!;
    } else {
      text = node.textContent || '';
      cache.set(node, text);
      segments.push({ node, start: offset });
      foundChangedNode = true;
    }
    if (!foundChangedNode) stablePrefixLength += text.length;
    parts.push(text);
    offset += text.length;
  }

  return { text: parts.join(''), stablePrefixLength, segments };
};

const getTextNodes = (node: Node) => {
  if (node.nodeType === Node.TEXT_NODE) return [node as Text];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  return textNodes;
};

const animateTextRanges = (
  segments: StreamTextSegment[],
  ranges: FadeRange[],
  spans: Set<HTMLElement>,
  now: number,
  duration: number,
) => {
  const rangesById = new Map(ranges.map((range) => [range.id, range]));
  const expiredParents = new Set<Node>();
  for (const span of spans) {
    const range = rangesById.get(Number(span.dataset.streamRange));
    if (!span.isConnected) {
      spans.delete(span);
    } else if (!range || Number(span.dataset.streamDuration) !== duration) {
      if (span.parentNode) expiredParents.add(span.parentNode);
      span.replaceWith(...span.childNodes);
      spans.delete(span);
    }
  }
  for (const parent of expiredParents) parent.normalize();

  let rangeIndex = 0;
  for (const segment of segments) {
    let nodeStart = segment.start;
    for (const textNode of getTextNodes(segment.node)) {
      const text = textNode.data;
      const nodeEnd = nodeStart + text.length;
      while (rangeIndex < ranges.length && ranges[rangeIndex].end <= nodeStart) rangeIndex += 1;
      if (textNode.parentElement?.closest(streamEnterSelector) || !canAnimateText(textNode)) {
        nodeStart = nodeEnd;
        continue;
      }
      if (ranges[rangeIndex]?.start < nodeEnd) {
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        for (let index = rangeIndex; index < ranges.length && ranges[index].start < nodeEnd; index += 1) {
          const range = ranges[index];
          const start = Math.max(range.start - nodeStart, cursor);
          const end = Math.min(range.end - nodeStart, text.length);
          if (start >= end) continue;
          if (cursor < start) fragment.append(text.slice(cursor, start));
          const span = document.createElement('span');
          span.className = style.streamEnter;
          span.dataset.streamRange = String(range.id);
          span.dataset.streamDuration = String(duration);
          span.style.setProperty('--stream-duration', `${duration}ms`);
          span.style.setProperty('--stream-delay', `${-Math.max(0, now - range.startedAt)}ms`);
          span.append(text.slice(start, end));
          fragment.append(span);
          spans.add(span);
          cursor = end;
        }
        if (cursor < text.length) fragment.append(text.slice(cursor));
        textNode.replaceWith(fragment);
      }
      nodeStart = nodeEnd;
    }
  }
};

@customElement('gem-bind-marked')
@adoptedStyle(streamKeyframesStyle)
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindMarkedElement extends GemElement {
  @property mdStyle?: CSSStyleSheet;

  /** Animate newly appended rendered text without restarting active fades. */
  @boolattribute streaming: boolean;

  /** Fade duration in milliseconds. Defaults to 400. */
  @numattribute streamingDuration: number;

  /**
   * [marked extensions](https://marked.js.org/using_pro#extensions),
   * e.g. custom `renderer` for links, code blocks, etc.
   */
  @property extensions?: MarkedExtension[];

  #ob = new MutationObserver(() => this.update());
  #marked = new Marked();
  #htmlCache = new Map<string, TemplateResult>();
  #streamVisibleText = '';
  #streamFadeRanges: FadeRange[] = [];
  #streamRangeId = 0;
  #streamTextCache = new WeakMap<Node, string>();
  #streamSpans = new Set<HTMLElement>();
  #streamDuration?: number;
  #streamCleanupTimer?: ReturnType<typeof setTimeout>;

  get #resolvedStreamingDuration() {
    return Number.isFinite(this.streamingDuration) && this.streamingDuration > 0 ? this.streamingDuration : 400;
  }

  @mounted()
  #mounted = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
    return () => {
      this.#ob.disconnect();
      this.#cancelStreamCleanup();
    };
  };

  @effect((i) => [i.mdStyle])
  #update = () => {
    if (!this.mdStyle) return;
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = [...sheets, this.mdStyle];
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  // recreate the parser so extensions don't accumulate between updates
  @memo((i) => [i.extensions])
  #updateParser = () => {
    this.#marked = new Marked();
    if (this.extensions) this.#marked.use(...this.extensions);
    this.#htmlCache.clear();
  };

  #cancelStreamCleanup() {
    if (this.#streamCleanupTimer === undefined) return;
    clearTimeout(this.#streamCleanupTimer);
    this.#streamCleanupTimer = undefined;
  }

  #scheduleStreamCleanup(now: number, duration: number) {
    this.#cancelStreamCleanup();
    const lastRange = this.#streamFadeRanges.at(-1);
    if (!lastRange) return;
    const remaining = Math.max(0, lastRange.startedAt + duration - now);
    this.#streamCleanupTimer = setTimeout(
      () => {
        this.#streamCleanupTimer = undefined;
        const cleanupTime = performance.now();
        this.#streamFadeRanges = this.#streamFadeRanges.filter(({ startedAt }) => cleanupTime - startedAt < duration);
        if (this.#streamFadeRanges.length) {
          this.#scheduleStreamCleanup(cleanupTime, duration);
          return;
        }
        unwrapAnimatedText(this.#streamSpans, true);
      },
      Math.min(remaining + 1, 2_147_483_647),
    );
  }

  @effect()
  #animateStreamingText = () => {
    const root = this.shadowRoot!;
    if (!this.streaming || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.#cancelStreamCleanup();
      unwrapAnimatedText(this.#streamSpans, true);
      this.#streamVisibleText = '';
      this.#streamFadeRanges = [];
      this.#streamRangeId = 0;
      this.#streamTextCache = new WeakMap();
      this.#streamDuration = undefined;
      return;
    }

    const now = performance.now();
    const duration = this.#resolvedStreamingDuration;
    if (duration !== this.#streamDuration) {
      this.#streamTextCache = new WeakMap();
      this.#streamDuration = duration;
    }
    const { text, stablePrefixLength, segments } = getStreamTextSnapshot(root, this.#streamTextCache);
    const prefixLength = commonPrefixLength(this.#streamVisibleText, text, stablePrefixLength);
    this.#streamFadeRanges = this.#streamFadeRanges
      .filter(({ startedAt, start }) => now - startedAt < duration && start < prefixLength)
      .map((range) => ({ ...range, end: Math.min(range.end, prefixLength) }));
    if (text.length > prefixLength) {
      this.#streamFadeRanges.push({ id: ++this.#streamRangeId, start: prefixLength, end: text.length, startedAt: now });
    }
    this.#streamVisibleText = text;
    if (this.#streamFadeRanges.length) {
      animateTextRanges(segments, this.#streamFadeRanges, this.#streamSpans, now, duration);
      this.#scheduleStreamCleanup(now, duration);
    } else {
      this.#cancelStreamCleanup();
      unwrapAnimatedText(this.#streamSpans, true);
    }
  };

  render = () => {
    const tokens = this.#marked.lexer(this.textContent || '');
    const next: TemplateResult[] = [];
    const nextCache = new Map<string, TemplateResult>();
    for (const token of tokens) {
      let result = this.#htmlCache.get(token.raw);
      if (!result) {
        const content = this.#marked.parser([token]);
        // Marked has already produced HTML, so use it as a static Gem template.
        result = html([content] as unknown as TemplateStringsArray);
      }
      nextCache.set(token.raw, result);
      next.push(result);
    }
    this.#htmlCache = nextCache;
    return html`${next}`;
  };
}
