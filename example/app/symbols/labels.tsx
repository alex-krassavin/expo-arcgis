import { FeatureLayer, Map, MapView, type LabelDefinition } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

// White city names with a dark halo. The text comes from `expression`.
const CITIES_LABELS: LabelDefinition[] = [
  {
    expression: '[CITY_NAME]',
    symbol: { type: 'text', text: '', color: '#ffffff', size: 11, haloColor: '#000000', haloWidth: 1.5 },
  },
];

/** Labels a feature layer's features with an Arcade expression. */
export default function Labels() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 40, longitude: -100, scale: 50_000_000 }}>
      <FeatureLayer url={WORLD_CITIES} labelsEnabled labels={CITIES_LABELS} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
