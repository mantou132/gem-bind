import { blockContainer } from 'duoyun-ui/lib/styles';
import lottie, { type AnimationDirection, type AnimationItem } from 'lottie-web';

import './types';

export * from 'lottie-web';

const style = css``;

@customElement('gem-bind-lottie')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
@shadow()
export class GemBindLottieElement extends GemElement {
  @attribute src: string;
  @boolattribute autoplay: boolean;
  @boolattribute loop: boolean;
  @numattribute speed: number;
  @numattribute direction: AnimationDirection | 0;
  @boolattribute subframe: boolean;

  #animate: AnimationItem | null = null;

  @effect((i) => [i.src])
  #reset = () => {
    if (!this.src) {
      this.#animate = null;
      return;
    }
    this.#animate = lottie.loadAnimation({
      container: this.shadowRoot as any,
      renderer: 'svg',
      path: this.src,
    });
    return () => this.#animate?.destroy();
  };

  @effect((i) => [i.loop, i.autoplay, i.speed, i.direction, i.subframe])
  #update = () => {
    if (this.#animate) {
      this.#animate.loop = this.loop;
      this.#animate.autoplay = this.autoplay;
      this.#animate.setSpeed(this.speed || 1);
      this.#animate.setDirection(this.direction || 1);
      this.#animate.setSubframe(this.subframe);
    }
  };

  play() {
    this.#animate?.play();
  }
  pause() {
    this.#animate?.pause();
  }
  stop() {
    this.#animate?.stop();
  }
  goToAndStop(value: number) {
    this.#animate?.goToAndStop(value, true);
  }
}
