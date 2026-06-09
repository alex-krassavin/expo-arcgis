import { Map, MapView } from 'expo-arcgis';

/** Displays a topographic basemap centered on the Santa Monica Mountains. */
export default function DisplayMap() {
  return (
    <Map
      basemap="arcGISTopographic"
      initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
    >
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
