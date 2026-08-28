# Gem bind

把一些流行库封装成 [Web Components](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components)，可在 [Gem](https://github.com/mantou132/gem) 或任何框架中使用。

## 包列表

| 包 | 元素 | 库 |
| --- | --- | --- |
| [`@gem-bind/marked`](./packages/marked) | `<gem-bind-marked>` | [marked](https://marked.js.org/) — 渲染 Markdown |
| [`@gem-bind/lottie`](./packages/lottie) | `<gem-bind-lottie>` | [lottie-web](https://github.com/airbnb/lottie-web) — 播放 Lottie 动画 |
| [`@gem-bind/diff2html`](./packages/diff2html) | `<gem-bind-diff2html>` | [diff2html](https://diff2html.xyz/) — 渲染 diff |
| [`@gem-bind/map`](./packages/map) | `<gem-bind-map>` | [d3-geo](https://d3js.org/d3-geo) — 渲染交互式地图 |
| [`@gem-bind/flow`](./packages/flow) | `<gem-bind-flow>` | [ELK](https://www.eclipse.org/elk/) — 自动布局有向图 |

## 使用

```html
<script type="module" src="https://esm.sh/@gem-bind/marked"></script>

<gem-bind-marked># Hello *world*</gem-bind-marked>
```

各包的属性、方法和自定义渲染见对应 README。

## 开发

```bash
pnpm i        # 安装依赖并构建所有包
pnpm start    # 运行示例开发服务器（packages/examples）
pnpm lint     # biome + 类型检查
```
