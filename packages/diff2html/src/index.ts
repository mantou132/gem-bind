import { html } from 'diff2html';
import type { ColorSchemeType } from 'diff2html/lib/types';
import { blockContainer } from 'duoyun-ui/lib/styles';
import type { HLJSApi } from 'highlight.js';

// upstream's `Diff2HtmlUI` with its highlighting support is not reachable
// through diff2html's package exports, hence these vendored helpers
import { mergeStreams, nodeStream } from './helpers';

import './types';

export * from 'diff2html';
export * from 'highlight.js';

const DIFF_CSS = 'https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css';
const hljsCssUrl = (dark: boolean) =>
  `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github${dark ? '-dark' : ''}.min.css`;

// Cache by URL: one network request and one shared CSSStyleSheet no matter how
// many instances exist or how often colorScheme toggles.
const sheetCache = new Map<string, Promise<CSSStyleSheet>>();
const loadSheet = (url: string) => {
  let loading = sheetCache.get(url);
  if (!loading) {
    loading = fetch(url)
      .then((res) => res.text())
      .then((text) => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        return sheet;
      });
    sheetCache.set(url, loading);
  }
  return loading;
};

// Block module evaluation (and thus the element registration) on the diff2html
// stylesheet, so the first render can never paint unstyled content
const diffCss = await loadSheet(DIFF_CSS);

// highlight.js is only imported when highlighting is actually used
let hljsLoading: Promise<HLJSApi> | undefined;
const loadHljs = () => (hljsLoading ??= import('highlight.js/lib/common').then((m) => m.default));

// diff2html's line numbers are `position: absolute` while its CSS never
// establishes a positioning context; abspos containing-block resolution
// crosses the shadow boundary, so an outer positioned ancestor outside the
// embedder's scroll container would capture them and freeze them on scroll
const style = css`
  :host([color-scheme=dark]) {
    border: 1px solid var(--d2h-dark-border-color);
  }

  :host {
    border: 1px solid var(--d2h-border-color);

    position: relative;
    overflow: hidden;
    box-sizing: border-box;

    .d2h-code-linenumber,
    .d2h-file-side-diff:first-child .d2h-code-side-linenumber {
      border-left: none;
    }

    .d2h-wrapper .d2h-file-wrapper {
      margin-bottom: 0;
      border: none;
    }

    .d2h-file-name-wrapper {
      flex-wrap: nowrap;
    }

    .d2h-file-name {
      min-width: 0;
    }

    .d2h-tag {
      flex-shrink: 0;
      white-space: nowrap;
    }

    .d2h-dark-color-scheme {
      .d2h-code-linenumber,
      .d2h-code-side-linenumber {
        background-color: var(--d2h-dark-bg-color);

        &.d2h-ins {
          background: linear-gradient(var(--d2h-dark-ins-bg-color), var(--d2h-dark-ins-bg-color)) var(--d2h-dark-bg-color);

          &.d2h-change {
            background: linear-gradient(var(--d2h-dark-change-ins-color), var(--d2h-dark-change-ins-color)) var(--d2h-dark-bg-color);
          }
        }

        &.d2h-del {
          background: linear-gradient(var(--d2h-dark-del-bg-color), var(--d2h-dark-del-bg-color)) var(--d2h-dark-bg-color);

          &.d2h-change {
            background: linear-gradient(var(--d2h-dark-change-del-color), var(--d2h-dark-change-del-color)) var(--d2h-dark-bg-color);
          }
        }

        &.d2h-info {
          background: linear-gradient(var(--d2h-dark-info-bg-color), var(--d2h-dark-info-bg-color)) var(--d2h-dark-bg-color);
        }

        &.d2h-emptyplaceholder {
          background: linear-gradient(var(--d2h-dark-empty-placeholder-bg-color), var(--d2h-dark-empty-placeholder-bg-color)) var(--d2h-dark-bg-color);
        }
      }
    }
  }


  :host([no-header]) {
    .d2h-file-header {
      display: none;
    }
  }

  :host([compact-line-numbers]) {
    .d2h-code-linenumber {
      width: 3.75em;
    }

    .d2h-code-line {
      padding-inline: 4.5em;
    }
  }
`;

@customElement('gem-bind-diff2html')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindDiff2htmlElement extends GemElement {
  @attribute outputFormat: 'line-by-line' | 'side-by-side';
  @boolattribute drawFileList: boolean;
  @attribute srcPrefix: string;
  @attribute dstPrefix: string;
  @numattribute diffMaxChanges: number;
  @numattribute diffMaxLineLength: number;
  @property diffTooBigMessage?: () => string;
  @attribute matching: 'lines' | 'words' | 'none';
  @attribute colorScheme: ColorSchemeType;
  @numattribute matchWordsThreshold: number;
  @numattribute maxLineLengthHighlight: number;
  @attribute diffStyle: 'word' | 'char';
  @boolattribute renderNothingWhenEmpty: boolean;
  @numattribute matchingMaxComparisons: number;
  @numattribute maxLineSizeInBlockForComparison: number;

  /** disable code highlighting, also skip loading highlight.js and its theme styles */
  @boolattribute noHighlight: boolean;

  /** hide diff file header */
  @boolattribute noHeader: boolean;

  @boolattribute compactLineNumbers: boolean;

  @property mdStyle?: CSSStyleSheet;

  #ob = new MutationObserver(() => this.#render());
  #sheetsSeq = 0;
  #renderSeq = 0;
  #managedSheets: CSSStyleSheet[] = [];

  @mounted()
  #mounted = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
  };

  #applySheets(sheets: CSSStyleSheet[]) {
    const root = this.shadowRoot!;
    const prevManaged = this.#managedSheets;
    this.#managedSheets = this.mdStyle ? [...sheets, this.mdStyle] : sheets;
    // only swap out the sheets this element loaded itself, keeping foreign ones
    // (e.g. the `blockContainer` decorator style)
    root.adoptedStyleSheets = [
      ...root.adoptedStyleSheets.filter((s) => !prevManaged.includes(s)),
      ...this.#managedSheets,
    ];
  }

  @effect((i) => [i.noHighlight, i.colorScheme, i.mdStyle])
  #updateSheets = () => {
    const seq = ++this.#sheetsSeq;
    // diff2html css is ready (preloaded at module level), so apply it
    // synchronously before the first render paints. The highlight theme goes
    // first once loaded: adoptedStyleSheets cascade in order, so the diff2html
    // stylesheet (and `mdStyle`) must be able to override it
    this.#applySheets([diffCss]);
    if (this.noHighlight) return;
    loadSheet(hljsCssUrl(this.colorScheme === 'dark')).then((theme) => {
      if (seq !== this.#sheetsSeq) return; // superseded while loading
      this.#applySheets([theme, diffCss]);
    });
  };

  @effect()
  #render = async () => {
    const seq = ++this.#renderSeq;
    this.shadowRoot!.innerHTML = html(this.textContent || '', {
      colorScheme: this.colorScheme,
      outputFormat: this.outputFormat || 'line-by-line',
      drawFileList: this.drawFileList,
      srcPrefix: this.srcPrefix,
      dstPrefix: this.dstPrefix,
      diffMaxChanges: this.diffMaxChanges || undefined,
      diffMaxLineLength: this.diffMaxLineLength || undefined,
      diffTooBigMessage: this.diffTooBigMessage,
      matching: this.matching || 'none',
      matchWordsThreshold: this.matchWordsThreshold || 0.25,
      maxLineLengthHighlight: this.maxLineLengthHighlight || 10000,
      diffStyle: this.diffStyle || 'word',
      renderNothingWhenEmpty: this.renderNothingWhenEmpty,
      matchingMaxComparisons: this.matchingMaxComparisons || 2500,
      maxLineSizeInBlockForComparison: this.maxLineSizeInBlockForComparison || 200,
    });
    await this.#highlight(seq);
  };

  #highlight = async (seq: number) => {
    if (this.noHighlight) return;
    const files = [...this.shadowRoot!.querySelectorAll<HTMLElement>('.d2h-file-wrapper[data-lang]')];
    if (!files.length) return;
    const hljs = await loadHljs();
    if (seq !== this.#renderSeq) return; // superseded by a newer render
    files.forEach((file) => {
      // `data-lang` holds a filename extension like `ts`;
      // hljs aliases resolve it to the language id (`typescript`)
      const language = file.getAttribute('data-lang')!;
      if (!hljs.getLanguage(language)) return;
      file.querySelectorAll('.d2h-code-line-ctn').forEach((line) => {
        const text = line.textContent || '';
        const result = hljs.highlight(text, { language, ignoreIllegals: true });
        const originalStream = nodeStream(line);
        if (originalStream.length) {
          // re-insert word diff tags (<ins>/<del>) into the highlighted HTML
          const highlightedNode = document.createElement('div');
          highlightedNode.innerHTML = result.value;
          line.innerHTML = mergeStreams(originalStream, nodeStream(highlightedNode), text);
        } else {
          line.innerHTML = result.value;
        }
        line.classList.add('hljs', `language-${result.language}`);
      });
    });
  };
}
