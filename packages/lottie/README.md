# @gem-bind/lottie

Play [Lottie](https://airbnb.io/lottie/) animations with a `<gem-bind-lottie>` web component, powered by [lottie-web](https://github.com/airbnb/lottie-web).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/lottie"></script>
<gem-bind-lottie src="https://assets.example.com/animation.json" autoplay loop></gem-bind-lottie>
```

## Attributes

| Attribute   | Type      | Default | Description               |
| ----------- | --------- | ------- | ------------------------- |
| `src`       | `string`  | —       | Animation JSON URL        |
| `autoplay`  | `boolean` | `false` | Play on load              |
| `loop`      | `boolean` | `false` | Loop the animation        |
| `speed`     | `number`  | `1`     | Playback speed            |
| `direction` | `number`  | `1`     | `1` forward, `-1` reverse |
| `subframe`  | `boolean` | `false` | Render at subframe accuracy |

## Methods

```js
const el = document.querySelector('gem-bind-lottie');
el.play();
el.pause();
el.stop();
el.goToAndStop(500); // jump to 500ms and pause
```

`lottie-web` is re-exported, so `AnimationItem` types and utilities are available from this package.
