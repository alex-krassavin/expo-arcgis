import { KmlLayer, Map, MapView } from 'expo-arcgis';

// A public KML feed (USGS earthquakes, magnitude 2.5+ over the past week).
const EARTHQUAKES_KML =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.kml';

/** Adds a KML layer from a remote `.kml` feed. */
export default function KmlLayerSample() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
      <KmlLayer url={EARTHQUAKES_KML} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
