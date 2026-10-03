import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  GraphicsOverlay,
  Map,
  MapView,
  setTokenCredential,
  type GraphicsOverlayRef,
  type MapViewHandle,
} from 'expo-arcgis';
import { UtilityNetworkTrace } from 'expo-arcgis-toolkit';

import { UN_LOGIN } from '../../src/utilityNetworkLogin';

// Esri's Naperville electric web map with named trace configurations, as in the Toolkit's
// utility network trace example. Its layers are on sampleserver7, behind Esri's public sample login.
const UN_WEB_MAP_ID = '471eb0bf37074b1fbb972b1da70fb310';

// The challenge handler signs in with this login when the web map's layers ask for it.
setTokenCredential(UN_LOGIN.username, UN_LOGIN.password);

/**
 * The ArcGIS Toolkit's utility network trace below the map, bound to the `<MapView>` through its
 * ref. Pick a trace configuration, add starting points by tapping the map (the map view's taps go to
 * the trace as `mapPoint`), and trace: starting points and results are drawn into the app's overlay.
 */
export default function UtilityNetworkTraceSample() {
  const mapView = useRef<MapViewHandle>(null);
  const overlay = useRef<GraphicsOverlayRef>(null);
  const [mapPoint, setMapPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <Map portalItem={{ itemId: UN_WEB_MAP_ID }}>
        <MapView
          ref={mapView}
          style={{ flex: 1 }}
          onTap={({ nativeEvent }) => setMapPoint(nativeEvent.mapPoint)}
        >
          <GraphicsOverlay ref={overlay} />
        </MapView>
      </Map>
      <UtilityNetworkTrace
        geoView={mapView}
        graphicsOverlay={overlay}
        mapPoint={mapPoint}
        style={{ height: 380, backgroundColor: 'white' }}
      />
    </View>
  );
}
