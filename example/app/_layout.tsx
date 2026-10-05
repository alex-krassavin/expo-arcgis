import '../global.css';

import { MapSettings } from 'expo-arcgis';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

/**
 * Root layout. Applies the ArcGIS API key globally. Screens have no navigation header: a sample's
 * map fills the screen, under the status bar, which shows dark icons over the maps' light colors.
 */
export default function RootLayout() {
  return (
    <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
      <StatusBar barStyle="dark-content" />
      <Stack screenOptions={{ headerShown: false }} />
    </MapSettings>
  );
}
