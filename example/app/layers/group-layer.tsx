import { FeatureLayer, GroupLayer, Map, MapImageLayer, MapView } from 'expo-arcgis';

const USA_MAP_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';
const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/** Groups two layers into one unit with `<GroupLayer>` — they share the group's opacity. */
export default function GroupLayerSample() {
  return (
    <Map basemap="arcGISLightGray" initialViewpoint={{ latitude: 39, longitude: -98, scale: 50_000_000 }}>
      <GroupLayer opacity={0.85}>
        <MapImageLayer url={USA_MAP_SERVICE} />
        <FeatureLayer url={WORLD_CITIES} />
      </GroupLayer>
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
