import type { GemBindMapElement, Geo, GeoCommonProjection, PanEventDetail } from '@gem-bind/map';
import { html, render } from '@mantou/gem';

import '@gem-bind/map';
import '../elements/layout';

const pageStyle = new CSSStyleSheet();
pageStyle.replaceSync(`
  main {
    box-sizing: border-box;
  }
  gem-bind-map {
    width: min(100%, 960px);
    margin-inline: auto;
  }
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageStyle];

const getProjection = (geoCommonProjection: GeoCommonProjection) => {
  return geoCommonProjection()
    .translate([10, 10])
    .center([107, 35])
    .scale((360 / 2.5 / Math.PI) * 5.4);
};

const onPan = ({ target, detail: { x, y } }: CustomEvent<PanEventDetail>) => {
  const map = target as GemBindMapElement;
  map.translate2D = [map.translate2D[0] + x, map.translate2D[1] + y];
};

const loadGeo = async () => {
  const response = await fetch('https://raw.githubusercontent.com/mantou132/javascript-learn/master/geo/china.json');
  if (!response.ok) throw new Error(`Failed to load map data: ${response.status}`);
  return response.json() as Promise<Geo>;
};

loadGeo().then((geo) => {
  render(
    html`
      <gem-examples-layout>
        <main>
          <gem-bind-map
            .geo=${geo}
            .getProjection=${getProjection}
            .getAreaName=${(name: string) => name}
            .getAreaColor=${(name: string) => (name === '湖南省' ? 'green' : undefined)}
            .nodes=${[{ id: '长沙市', position: [112.9389, 28.2278] }]}
            @nodehover=${console.log}
            @areahover=${console.log}
            @pan=${onPan}
          ></gem-bind-map>
        </main>
      </gem-examples-layout>
    `,
    document.body,
  );
});
