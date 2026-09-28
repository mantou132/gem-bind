# @gem-bind/echarts

Render [Apache ECharts](https://echarts.apache.org/) charts with a `<gem-bind-echarts>` web component. The chart resizes automatically with the element.

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/echarts"></script>
<gem-bind-echarts style="height: 400px"></gem-bind-echarts>
<script>
  document.querySelector('gem-bind-echarts').option = {
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [120, 200, 150] }],
  };
</script>
```

## Attributes

| Attribute  | Type                 | Default    | Description                                                    |
| ---------- | -------------------- | ---------- | -------------------------------------------------------------- |
| `theme`    | `string`             | —          | Registered theme name; `dark` when the color-scheme is dark    |
| `renderer` | `'canvas' \| 'svg'`  | `'canvas'` | Rendering backend                                              |

## Properties

| Property        | Type            | Description                                   |
| --------------- | --------------- | --------------------------------------------- |
| `option`        | `EChartsOption` | Chart option, applied via `setOption`         |
| `setOptionOpts` | `SetOptionOpts` | Options for `setOption`, e.g. `{ notMerge: true }` |
| `chart`         | `EChartsType`   | Read-only underlying ECharts instance         |

```js
const el = document.querySelector('gem-bind-echarts');
el.chart.on('click', (params) => console.log(params));
```

The `echarts` namespace (e.g. `echarts.registerTheme`) and common types like `EChartsOption` are re-exported from this package.
