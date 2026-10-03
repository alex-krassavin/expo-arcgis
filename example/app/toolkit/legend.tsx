import { StyleSheet } from 'react-native';
import { FeatureLayer, Map, MapImageLayer, MapView } from 'expo-arcgis';
import { Legend } from 'expo-arcgis-toolkit';

const USA_MAP_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';
const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/**
 * The ArcGIS Toolkit's legend over a map whose layers are declared in JS: a map image layer with
 * sublayers and a feature layer. It follows the view's scale: zoom in and the layers that only draw
 * up close join it. Android only; on iOS it renders nothing.
 */
export default function LegendSample() {
  return (
    <Map basemap="arcGISLightGray" initialViewpoint={{ latitude: 39, longitude: -98, scale: 30_000_000 }}>
      <MapImageLayer url={USA_MAP_SERVICE} />
      <FeatureLayer url={WORLD_CITIES} />
      <MapView style={{ flex: 1 }}>
        <Legend style={styles.legend} />
      </MapView>
    </Map>
  );
}

const styles = StyleSheet.create({
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 36,
    width: 230,
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
});
