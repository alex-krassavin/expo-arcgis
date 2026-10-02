// Dynamic Expo config so the ArcGIS API key can come from an environment variable.
// Provide it at prebuild/build time, e.g. `ARCGIS_API_KEY=... npx expo run:ios`.
module.exports = {
  expo: {
    name: 'expo-arcgis-example',
    slug: 'expo-arcgis-example',
    version: '1.0.0',
    scheme: 'expoarcgisexample',
    orientation: 'portrait',
    // The sample UI is styled for light mode (also Expo's default; set to quiet expo-doctor).
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    ios: {
      bundleIdentifier: 'com.example.expoarcgis',
    },
    android: {
      package: 'com.example.expoarcgis',
    },
    plugins: [
      'expo-router',
      [
        'expo-arcgis',
        {
          // Optional — when omitted, set the key at runtime via ExpoArcgis.setApiKey().
          apiKey: process.env.ARCGIS_API_KEY,
          // Adds NSLocationWhenInUseUsageDescription (iOS) + ACCESS_FINE/COARSE_LOCATION (Android).
          locationWhenInUseUsageDescription: 'Show your location on the map',
        },
      ],
    ],
  },
};
