import { blockContainer } from 'duoyun-ui/lib/styles';
import * as echarts from 'echarts';
import type { EChartsOption, EChartsType, SetOptionOpts } from 'echarts';

import './types';

export { echarts };

export type { EChartsInitOpts, EChartsOption, EChartsType, SetOptionOpts } from 'echarts';

const style = css`
  :host(:where(:not([hidden]))) {
    height: 300px;
  }
  :host > div {
    width: 100%;
    height: 100%;
  }
`;

// `light dark` follows the system preference.
const isDark = (colorScheme: string) =>
  colorScheme === 'dark' || (colorScheme.includes('dark') && matchMedia('(prefers-color-scheme: dark)').matches);

/** Renders an Apache ECharts chart, auto-resizing with the element. */
@customElement('gem-bind-echarts')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindEchartsElement extends GemElement {
  /** Registered theme name, defaults to `dark` when the element's color-scheme is dark. */
  @attribute theme: string;
  @attribute renderer: 'canvas' | 'svg';
  @property option?: EChartsOption;
  /** Options passed to `setOption`, e.g. `{ notMerge: true }`. */
  @property setOptionOpts?: SetOptionOpts;

  #chart: EChartsType | null = null;
  #appliedOption?: EChartsOption;
  #containerRef = createRef<HTMLDivElement>();

  /** The underlying ECharts instance, available after mount. */
  get chart() {
    return this.#chart;
  }

  render = () => html`<div ${this.#containerRef}></div>`;

  @effect((i) => [i.theme, i.renderer])
  #init = () => {
    const theme = this.theme || (isDark(getComputedStyle(this).colorScheme) ? 'dark' : undefined);
    const chart = echarts.init(this.#containerRef.value!, theme, { renderer: this.renderer || 'canvas' });
    this.#chart = chart;
    this.#applyOption();
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(this);
    return () => {
      observer.disconnect();
      chart.dispose();
      this.#chart = null;
      this.#appliedOption = undefined;
    };
  };

  #applyOption = () => {
    if (!this.#chart || !this.option || this.#appliedOption === this.option) return;
    this.#chart.setOption(this.option, this.setOptionOpts);
    this.#appliedOption = this.option;
  };

  @effect((i) => [i.option])
  #update = () => this.#applyOption();
}
