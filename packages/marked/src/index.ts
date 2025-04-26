import { blockContainer } from 'duoyun-ui/lib/styles';
import { marked } from 'marked';

import './types';

const style = css``;

@customElement('gem-bind-marked')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindMarkedElement extends GemElement {
  @property mdStyle?: CSSStyleSheet;

  #ob = new MutationObserver(() => this.#render());

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

  @effect()
  #render = async () => {
    this.shadowRoot!.innerHTML = await marked.parse(this.innerHTML);
  };
}
