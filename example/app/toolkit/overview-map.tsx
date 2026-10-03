import { Map, MapView } from 'expo-arcgis';
import { OverviewMap } from 'expo-arcgis-toolkit';

/**
 * The ArcGIS Toolkit's overview map: a small map that outlines the main map's visible area, at 25
 * times its scale. Pan and zoom the map; the outline follows. iOS only: the Kotlin Toolkit has no
 * overview map.
 */
export default function OverviewMapSample() {
  return (
    <Map
      basemap="arcGISImagery"
      initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
    >
      <MapView style={{ flex: 1 }}>
        <OverviewMap alignment="bottomTrailing" />
      </MapView>
    </Map>
  );
}
