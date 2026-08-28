import type { TemplateResult } from '@mantou/gem';
import { blockContainer } from 'duoyun-ui/lib/styles';
import { Marked, type MarkedExtension } from 'marked';

import './types';

export * from 'marked';

// Marked has already produced HTML, so use it as a static Gem template.
const templateCache = new Map<string, TemplateResult>();
const template = (content: string) => {
  let result = templateCache.get(content);
  if (!result) {
    result = html([content] as unknown as TemplateStringsArray);
    templateCache.set(content, result);
  }
  return result;
};

const style = css``;

@customElement('gem-bind-marked')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindMarkedElement extends GemElement {
  @property mdStyle?: CSSStyleSheet;

  /**
   * [marked extensions](https://marked.js.org/using_pro#extensions),
   * e.g. custom `renderer` for links, code blocks, etc.
   */
  @property extensions?: MarkedExtension[];

  #ob = new MutationObserver(() => this.update());
  #marked = new Marked();
  #htmlCache = new Map<string, string>();

  @mounted()
  #mounted = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
    return () => this.#ob.disconnect();
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

  render = () => {
    const tokens = this.#marked.lexer(this.textContent || '');
    const next: TemplateResult[] = [];
    for (const token of tokens) {
      let content = this.#htmlCache.get(token.raw);
      if (content === undefined) {
        content = this.#marked.parser([token]);
        this.#htmlCache.set(token.raw, content);
      }
      next.push(template(content));
    }
    return html`${next}`;
  };
}
