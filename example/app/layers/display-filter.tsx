import { FeatureLayer, Map, MapView } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/**
 * A display filter hides features on the client without re-querying the service — here only
 * cities with a population over five million are drawn.
 */
export default function DisplayFilter() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
      <FeatureLayer
        url={WORLD_CITIES}
        displayFilter={{ whereClause: 'POP > 5000000', name: 'Megacities' }}
      />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
