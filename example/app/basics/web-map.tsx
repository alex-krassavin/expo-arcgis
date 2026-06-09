import { Map, MapView } from 'expo-arcgis';

// A public ArcGIS Online web map (portal item).
const WEB_MAP_ID = '41281c51f9de45edaf1c8ed44bb10e30';

/** Loads a web map from a portal item — basemap, layers and bookmarks come from the item. */
export default function WebMap() {
  return (
    <Map portalItem={{ itemId: WEB_MAP_ID }}>
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
