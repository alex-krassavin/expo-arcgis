import { FeatureLayer, Map, MapView, type Renderer } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

// A simple renderer whose marker size AND color are both driven by the POP field — bigger,
// redder circles for more populous cities. Visual variables layer on top of any renderer.
const RENDERER: Renderer = {
  type: 'simple',
  symbol: { type: 'simple-marker', color: '#2c7fb8', size: 6 },
  visualVariables: [
    { type: 'size', field: 'POP', minDataValue: 100_000, maxDataValue: 10_000_000, minSize: 6, maxSize: 42 },
    {
      type: 'color',
      field: 'POP',
      stops: [
        { value: 100_000, color: '#2c7fb8' },
        { value: 10_000_000, color: '#e63946' },
      ],
    },
  ],
};

/** Data-driven symbology — marker size and color both scale with the POP (population) field. */
export default function VisualVariables() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
      <FeatureLayer url={WORLD_CITIES} renderer={RENDERER} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
