import { FeatureLayer, Map, MapView } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/**
 * A scale-based display filter swaps the active where-clause as you zoom: only the largest cities
 * are drawn at small scales, every city once you zoom in. (`0` = unbounded.)
 */
export default function ScaleDisplayFilter() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
      <FeatureLayer
        url={WORLD_CITIES}
        scaleDisplayFilter={[
          { minScale: 25_000_000, maxScale: 0, whereClause: 'POP > 5000000' },
          { minScale: 0, maxScale: 25_000_000, whereClause: '1=1' },
        ]}
      />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
