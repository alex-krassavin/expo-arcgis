import { Map, MapSettings, MapView } from 'expo-arcgis';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [status, setStatus] = useState('Loading map…');

  return (
    <SafeAreaView style={styles.container}>
      <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
        <Map
          basemap="arcGISTopographic"
          initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
        >
          <MapView
            style={styles.map}
            onMapLoaded={() => setStatus('Map loaded ✅')}
            onMapLoadError={(event) => setStatus(`Load error: ${event.nativeEvent.message}`)}
          />
        </Map>
      </MapSettings>
      <View style={styles.bar}>
        <Text style={styles.status}>{status}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bar: { padding: 12, backgroundColor: '#101418' },
  status: { color: '#ffffff', textAlign: 'center' },
});
