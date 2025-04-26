import { html } from 'diff2html';
import { blockContainer } from 'duoyun-ui/lib/styles';
import './types';

const res = await fetch('https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css');
const styleText = await res.text();
const style = new CSSStyleSheet();
style.replaceSync(styleText);

// https://bugzilla.mozilla.org/show_bug.cgi?id=1720570
// const { default: style } = await import('https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css', {
//   with: { type: 'css' }
// });

@customElement('gem-bind-diff2html')
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
  @numattribute matchWordsThreshold: number;
  @numattribute maxLineLengthHighlight: number;
  @attribute diffStyle: 'word' | 'char';
  @boolattribute renderNothingWhenEmpty: boolean;
  @numattribute matchingMaxComparisons: number;
  @numattribute maxLineSizeInBlockForComparison: number;

  @property mdStyle?: CSSStyleSheet;

  #ob = new MutationObserver(() => this.#render());

  @mounted()
  #mounted = () => {
    this.#ob.observe(this, { characterData: true, childList: true, subtree: true });
  };

  @effect((i) => [i.mdStyle])
  #update = () => {
    const sheets = [style].concat( this.shadowRoot!.adoptedStyleSheets);
    this.shadowRoot!.adoptedStyleSheets = sheets.concat(this.mdStyle || []);
    return () => (this.shadowRoot!.adoptedStyleSheets = sheets);
  };

  @effect()
  #render = async () => {
    this.shadowRoot!.innerHTML = html(this.textContent || '', {
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
  };
}
