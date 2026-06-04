import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapSettings,
  MapView,
  type MapLoadErrorEventPayload,
  type TapEventPayload,
} from 'expo-arcgis';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// "Add a point, line, and polygon" tutorial geometries (Santa Monica Mountains).
const POINT = { x: -118.80657, y: 34.00059 };
const LINE_POINTS = [
  { x: -118.82152, y: 34.01395 },
  { x: -118.81489, y: 34.00806 },
  { x: -118.80887, y: 34.00166 },
];
const POLYGON_POINTS = [
  { x: -118.81898, y: 34.01375 },
  { x: -118.80679, y: 34.02158 },
  { x: -118.79143, y: 34.01638 },
  { x: -118.79596, y: 34.00856 },
  { x: -118.80855, y: 34.0035 },
];

export default function App() {
  const [status, setStatus] = useState('Loading map…');
  const [pin, setPin] = useState<TapEventPayload['mapPoint'] | null>(null);

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
                {/* Point — orange circle with a blue outline */}
                <Graphic
                  geometry={{ type: 'point', ...POINT }}
                  symbol={{
                    type: 'simple-marker',
                    style: 'circle',
                    color: '#ffa500',
                    size: 10,
                    outline: { color: '#0000ff', width: 2 },
                  }}
                />
                {/* Polyline — solid blue */}
                <Graphic
                  geometry={{ type: 'polyline', points: LINE_POINTS }}
                  symbol={{ type: 'simple-line', color: '#0000ff', width: 3 }}
                />
                {/* Polygon — translucent orange fill with a blue outline */}
                <Graphic
                  geometry={{ type: 'polygon', points: POLYGON_POINTS }}
                  symbol={{
                    type: 'simple-fill',
                    color: '#ffa50080',
                    outline: { color: '#0000ff', width: 2 },
                  }}
                />
                {/* Tap to drop an extra pin */}
                {pin && (
                  <Graphic
                    geometry={{ type: 'point', x: pin.longitude, y: pin.latitude }}
                    symbol={{ type: 'simple-marker', color: '#ff3b30', size: 14 }}
                  />
                )}
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
