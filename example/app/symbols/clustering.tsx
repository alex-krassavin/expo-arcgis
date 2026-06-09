import { FeatureLayer, Map, MapView, type FeatureReduction } from 'expo-arcgis';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

// Cluster nearby features within a 60-point radius.
const CITY_CLUSTER: FeatureReduction = { type: 'cluster', radius: 60 };

/** Reduces dense features into clusters (feature reduction). */
export default function Clustering() {
  return (
    <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 30, longitude: 0, scale: 200_000_000 }}>
      <FeatureLayer url={WORLD_CITIES} featureReduction={CITY_CLUSTER} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
