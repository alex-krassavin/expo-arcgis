import { FeatureLayer, Map, MapView } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/** Adds a feature service layer (world cities) on top of a navigation basemap. */
export default function FeatureLayerSample() {
  return (
    <Map
      basemap="arcGISNavigation"
      initialViewpoint={{ latitude: 20, longitude: 0, scale: 147_000_000 }}
    >
      <FeatureLayer url={WORLD_CITIES} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
