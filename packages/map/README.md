# @gem-bind/map

Render interactive geographic data with the `<gem-bind-map>` web component, powered by
[d3-geo](https://d3js.org/d3-geo).

## Usage

```html
<script type="module" src="https://esm.sh/@gem-bind/map"></script>
<gem-bind-map></gem-bind-map>
```

Set `geo` to a GeoJSON feature collection. Optional callbacks control the projection, area labels and colors,
while `nodes` adds point overlays.

```ts
import '@gem-bind/map';

const map = document.querySelector('gem-bind-map');

map.geo = geojson;
map.getAreaName = (name) => name;
map.getAreaColor = (name) => (name === 'Kansas' ? 'green' : undefined);
map.nodes = [{ id: 'Topeka', position: [-95.6752, 39.0473] }];
map.addEventListener('pan', ({ detail: { x, y } }) => {
  map.translate2D = [map.translate2D[0] + x, map.translate2D[1] + y];
});
```

The package exports `GemBindMapElement`, `geoCommonProjection`, the built-in node `shapes`, and the element's
public TypeScript types.
