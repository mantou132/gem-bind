import { theme } from 'duoyun-ui/lib/theme';
import katex, { type KatexOptions } from 'katex';

import './types';

export * from 'katex';
export { default as katex } from 'katex';

const style = css`
  :host {
    display: inline-block;
    max-width: 100%;
    vertical-align: -0.08em;
  }

  :host([block]) {
    display: block;
    margin: 0.5rem 0;
    overflow-x: auto;
    vertical-align: initial;
    scrollbar-width: thin;
  }

  :host([block]):focus-visible {
    outline: 2px solid ${theme.focusColor};
    outline-offset: 2px;
  }

  :host([block]) .katex {
    display: block;
    width: max-content;
    min-width: 100%;
    padding: 0.35rem 0.25rem;
    box-sizing: border-box;
    text-align: center;
  }

  .katex {
    font-size: 1.06em;
  }
`;

/** Renders the element's text content as LaTeX. */
@customElement('gem-bind-latex')
@adoptedStyle(style)
@shadow()
export class GemBindLatexElement extends GemElement {
  /** Render as display math instead of inline math. */
  @boolattribute block: boolean;

  /** KaTeX render options. */
  @property options?: KatexOptions;

  /** Additional stylesheet adopted by the element's shadow root. */
  @property mdStyle?: CSSStyleSheet;

  #observer = new MutationObserver(() => this.update());

  @mounted()
  #observeSource = () => {
    this.#observer.observe(this, { characterData: true, childList: true, subtree: true });
    return () => this.#observer.disconnect();
  };

  @effect((i) => [i.mdStyle])
  #adoptCustomStyle = () => {
    if (!this.mdStyle) return;
    const sheets = this.shadowRoot!.adoptedStyleSheets;
    this.shadowRoot!.adoptedStyleSheets = [...sheets, this.mdStyle];
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  render = (): undefined => {
    const source = this.textContent?.trim();
    const root = this.shadowRoot!;
    if (!source) {
      root.replaceChildren();
      return;
    }

    try {
      katex.render(source, root as unknown as HTMLElement, {
        throwOnError: true,
        trust: false,
        strict: 'warn',
        ...this.options,
        displayMode: this.block,
        output: 'mathml',
      });
    } catch {
      root.replaceChildren();
    }
  };
}
