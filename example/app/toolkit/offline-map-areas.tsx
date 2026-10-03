import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Map, MapView, type MapRef } from 'expo-arcgis';
import { OfflineMapAreas, type OfflineMapAreasHandle } from 'expo-arcgis-toolkit';

// The offline-enabled web map of the Toolkit's offline map areas examples (Naperville water network).
const WEB_MAP_ID = 'acc027394bc84c2fb04d1ed317aac674';

/**
 * The ArcGIS Toolkit's offline map areas below the map: download a preplanned area, open it, and the
 * map view shows the offline map it hands out (`<MapView map>`). "Go online" returns to the web map.
 */
export default function OfflineMapAreasSample() {
  const areas = useRef<OfflineMapAreasHandle>(null);
  const [offlineMap, setOfflineMap] = useState<MapRef | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <Map portalItem={{ itemId: WEB_MAP_ID }}>
        <MapView map={offlineMap} style={{ flex: 1 }}>
          <View style={styles.banner}>
            <Text style={styles.text}>{offlineMap ? 'Offline map area' : 'Web map (online)'}</Text>
            {offlineMap && (
              <Pressable style={styles.button} onPress={() => areas.current?.goOnline()}>
                <Text style={styles.buttonText}>Go online</Text>
              </Pressable>
            )}
          </View>
        </MapView>
        <OfflineMapAreas ref={areas} onSelectionChange={setOfflineMap} style={styles.panel} />
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { height: 380, backgroundColor: 'white' },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  text: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  button: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2563eb' },
  buttonText: { color: 'white', fontWeight: '600' },
});
