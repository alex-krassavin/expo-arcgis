import { Map, MapImageLayer, MapView } from 'expo-arcgis';

// A public ArcGIS dynamic map service.
const USA_MAP_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';

/** Adds a dynamic map-image layer (server-rendered) over a basemap. */
export default function MapImageLayerSample() {
  return (
    <Map basemap="arcGISLightGray" initialViewpoint={{ latitude: 39, longitude: -98, scale: 50_000_000 }}>
      <MapImageLayer url={USA_MAP_SERVICE} opacity={0.7} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
