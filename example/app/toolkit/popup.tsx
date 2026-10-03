import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Map, MapView, type MapViewHandle, type PopupRef } from 'expo-arcgis';
import { PopupView } from 'expo-arcgis-toolkit';

// The web map of the Toolkit's popup example: layers with authored popups (fields, media,
// attachments).
const WEB_MAP_ID = '9f3a674e998f461580006e626611f9ad';

/**
 * The ArcGIS Toolkit's popup view below the map: tap a feature, and the popup `identifyPopups`
 * finds there (its `ref`) shows with its fields, media and attachments. Its close button clears it.
 */
export default function PopupSample() {
  const mapView = useRef<MapViewHandle>(null);
  const [popup, setPopup] = useState<PopupRef | null>(null);

  async function showPopupAt(screenPoint: { x: number; y: number }) {
    const [result] = (await mapView.current?.identifyPopups(screenPoint, { tolerance: 12 })) ?? [];
    setPopup(result?.ref ?? null);
  }

  return (
    <View style={{ flex: 1 }}>
      <Map portalItem={{ itemId: WEB_MAP_ID }}>
        <MapView
          ref={mapView}
          style={{ flex: 1 }}
          onTap={({ nativeEvent }) => showPopupAt(nativeEvent.screenPoint)}
        >
          <View style={styles.banner} pointerEvents="none">
            <Text style={styles.text}>{popup ? popup.title : 'Tap a feature'}</Text>
          </View>
        </MapView>
      </Map>
      {popup && <PopupView popup={popup} onDismiss={() => setPopup(null)} style={styles.popup} />}
    </View>
  );
}

const styles = StyleSheet.create({
  popup: { height: 380, backgroundColor: 'white' },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  text: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
});
