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
      infoPlist: {
        NSAppTransportSecurity: {
          // The development build loads its JavaScript from the local network.
          NSAllowsLocalNetworking: true,
          // The Toolkit samples' untrusted host: App Transport Security would reject it before
          // the authenticator can ask whether to trust it.
          NSExceptionDomains: {
            'self-signed.badssl.com': { NSExceptionAllowsInsecureHTTPLoads: true },
          },
        },
      },
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
      [
        'expo-arcgis-toolkit',
        {
          // The job manager sample keeps a download going across launches (iOS).
          jobManager: true,
          // The authenticator sample's OAuth redirect (Android).
          oAuthRedirectUris: ['my-ags-app://auth'],
          // Camera, location and ARCore for the augmented reality samples.
          ar: true,
        },
      ],
    ],
  },
};
