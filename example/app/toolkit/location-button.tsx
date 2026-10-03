import { Map, MapView } from 'expo-arcgis';
import { LocationButton } from 'expo-arcgis-toolkit';

/**
 * The ArcGIS Toolkit's location button. A tap starts the map's location display; further taps cycle
 * through the auto-pan modes (recenter, then compass navigation). iOS only: the Kotlin Toolkit has no
 * location button.
 */
export default function LocationButtonSample() {
  return (
    <Map
      basemap="arcGISStreets"
      initialViewpoint={{ latitude: 34.0565, longitude: -117.1956, scale: 50_000 }}
    >
      <MapView style={{ flex: 1 }}>
        <LocationButton autoPanModes={['recenter', 'compassNavigation']} />
      </MapView>
    </Map>
  );
}
