import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapSettings,
  MapView,
  type Point,
  type MapLoadErrorEventPayload,
  type TapEventPayload,
} from 'expo-arcgis';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const [status, setStatus] = useState('Loading map…');
  const [pin, setPin] = useState<Point | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
          <Map
            basemap="arcGISTopographic"
            initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
          >
            <MapView
              style={styles.map}
              onMapLoaded={() => setStatus('Map loaded ✅ — tap to drop a pin')}
              onMapLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                setStatus(`Load error: ${event.nativeEvent.message}`)
              }
              onTap={(event: { nativeEvent: TapEventPayload }) => setPin(event.nativeEvent.mapPoint)}
            >
              <GraphicsOverlay>
                {pin && <Graphic point={pin} symbol={{ color: '#ff3b30', size: 14 }} />}
              </GraphicsOverlay>
            </MapView>
          </Map>
        </MapSettings>
        <View style={styles.bar}>
          <Text style={styles.status}>{status}</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bar: { padding: 12, backgroundColor: '#101418' },
  status: { color: '#ffffff', textAlign: 'center' },
});
