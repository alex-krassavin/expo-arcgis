import { Map, MapView } from 'expo-arcgis';

/**
 * Overlays a coordinate grid on the map — here the military grid (MGRS). Also available:
 * `utm`, `usng` and `latitude-longitude`.
 */
export default function Grid() {
  return (
    <Map basemap="arcGISImagery" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 500_000 }}>
      <MapView style={{ flex: 1 }} grid={{ type: 'mgrs' }} />
    </Map>
  );
}
