import '../global.css';

import { MapSettings } from 'expo-arcgis';
import { Stack } from 'expo-router';

import { SAMPLES } from '../src/samples';

/**
 * Root layout. Applies the ArcGIS API key globally and configures a clean, branded navigation
 * header — sample screens show their human title (from the catalog), not the raw route path.
 */
export default function RootLayout() {
  return (
    <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
      <Stack
        screenOptions={({ route }) => ({
          title: SAMPLES.find((sample) => sample.href === `/${route.name}`)?.title ?? 'expo-arcgis',
          headerStyle: { backgroundColor: '#f4f4f5' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#171717' },
          headerTintColor: '#0079c1',
          headerShadowVisible: true,
        })}
      />
    </MapSettings>
  );
}
