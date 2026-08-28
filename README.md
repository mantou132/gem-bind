# Gem bind

[Web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that wrap some popular libraries, for use with [Gem](https://github.com/mantou132/gem) or any framework.

## Packages

| Package | Element | Library |
| --- | --- | --- |
| [`@gem-bind/marked`](./packages/marked) | `<gem-bind-marked>` | [marked](https://marked.js.org/) — render markdown |
| [`@gem-bind/lottie`](./packages/lottie) | `<gem-bind-lottie>` | [lottie-web](https://github.com/airbnb/lottie-web) — play Lottie animations |
| [`@gem-bind/diff2html`](./packages/diff2html) | `<gem-bind-diff2html>` | [diff2html](https://diff2html.xyz/) — render unified diffs |
| [`@gem-bind/map`](./packages/map) | `<gem-bind-map>` | [d3-geo](https://d3js.org/d3-geo) — render interactive maps |
| [`@gem-bind/flow`](./packages/flow) | `<gem-bind-flow>` | [ELK](https://www.eclipse.org/elk/) — lay out directed graphs |

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/marked"></script>

<gem-bind-marked># Hello *world*</gem-bind-marked>
```

See each package's README for attributes, properties and custom rendering.

## Development

```bash
pnpm i        # install and build all packages
pnpm start    # run the examples dev server (packages/examples)
pnpm lint     # biome + typecheck
```

中文说明见 [README_zh.md](./README_zh.md)。
