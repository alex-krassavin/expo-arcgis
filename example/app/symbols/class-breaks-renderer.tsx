import { FeatureLayer, Map, MapView, type Renderer } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

// Class-breaks renderer — graduated circles by the POP (population) field.
const CITIES_RENDERER: Renderer = {
  type: 'class-breaks',
  field: 'POP',
  classBreaks: [
    { min: 0, max: 1_000_000, symbol: { type: 'simple-marker', color: '#2c7fb8', size: 6 }, label: '< 1M' },
    { min: 1_000_000, max: 5_000_000, symbol: { type: 'simple-marker', color: '#7fcdbb', size: 11 }, label: '1–5M' },
    { min: 5_000_000, max: 50_000_000, symbol: { type: 'simple-marker', color: '#edf8b1', size: 18 }, label: '> 5M' },
  ],
};

/** Styles a feature layer with a class-breaks renderer (graduated circles by population). */
export default function ClassBreaksRenderer() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
      <FeatureLayer url={WORLD_CITIES} renderer={CITIES_RENDERER} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
