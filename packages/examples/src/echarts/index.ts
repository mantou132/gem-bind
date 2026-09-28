import type { EChartsOption } from '@gem-bind/echarts';
import { html, render } from '@mantou/gem';

import '@gem-bind/echarts';
import '../elements/layout';

const option: EChartsOption = {
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [
    { name: 'Visits', type: 'bar', data: [120, 200, 150, 80, 70, 110, 130] },
    { name: 'Orders', type: 'line', smooth: true, data: [30, 62, 48, 25, 20, 41, 55] },
  ],
};

render(
  html`
    <gem-examples-layout>
      <gem-bind-echarts style="height: 400px" .option=${option}></gem-bind-echarts>
    </gem-examples-layout>
  `,
  document.body,
);
