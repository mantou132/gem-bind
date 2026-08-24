import { blockContainer } from 'duoyun-ui/lib/styles';
import { Marked, type MarkedExtension } from 'marked';

import './types';

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

  #ob = new MutationObserver(() => this.#render());
  #marked = new Marked();

  @mounted()
  #mounted = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
  };

  @effect((i) => [i.mdStyle])
  #update = () => {
    if (!this.mdStyle) return;
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = [...sheets, this.mdStyle];
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  // recreate the parser so extensions don't accumulate between updates;
  // the following `#render` re-runs after this because it has no dep getter
  @effect((i) => [i.extensions])
  #updateParser = () => {
    this.#marked = new Marked();
    if (this.extensions) this.#marked.use(...this.extensions);
  };

  @effect()
  #render = async () => {
    this.shadowRoot!.innerHTML = await this.#marked.parse(this.innerHTML);
  };
}
