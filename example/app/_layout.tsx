import '../global.css';

import { MapSettings } from 'expo-arcgis';
import { Stack } from 'expo-router';

/**
 * Root layout. Applies the ArcGIS API key globally (from EXPO_PUBLIC_ARCGIS_API_KEY) and renders
 * the navigation stack — every sample screen inherits the key. The key can also be injected
 * natively by the config plugin at build time.
 */
export default function RootLayout() {
  return (
    <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
      <Stack screenOptions={{ headerTintColor: '#0079c1' }} />
    </MapSettings>
  );
}
