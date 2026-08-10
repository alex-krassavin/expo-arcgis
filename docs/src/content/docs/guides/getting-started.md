---
title: Getting started
description: Install expo-arcgis and render your first map.
---

`expo-arcgis` is a native [Expo module](https://docs.expo.dev/modules/overview/) wrapping the
ArcGIS Maps SDK for **Kotlin** (Android) and **Swift** (iOS). It is **not** available in Expo Go —
use a development build.

## Requirements

ArcGIS Maps SDK 300.1 sets the floor for any app using this module:

| | Minimum |
|---|---|
| iOS | **18.0**, built with **Xcode 26** |
| Android | **API 28** (Android 9), compileSdk **36** — Esri deprecated API 28 in 300.1; the next SDK release requires API 29 |
| Expo | SDK **54+** (New Architecture). Verified on Expo **56** / RN **0.82** / React **19** |
| Auth | An [ArcGIS API key](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/) (or token / OAuth) |

## Install

```sh
npx expo install expo-arcgis
```

Add the config plugin to your app config. It wires the Esri Maven repository (Android), raises
`minSdk` / `compileSdk` and the iOS deployment target, and (optionally) injects your API key.

```js
// app.config.js
module.exports = {
  expo: {
    plugins: [['expo-arcgis', { apiKey: process.env.ARCGIS_API_KEY }]],
  },
};
```

Then regenerate the native projects:

```sh
npx expo prebuild --clean
```

## Your first map

The API is declarative and mirrors the ArcGIS SDK object model — a `<Map>` model inside a
`<MapView>` host, wrapped in `<MapSettings>`:

```tsx
import { MapSettings, Map, MapView } from 'expo-arcgis';

export function Screen() {
  return (
    <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
      <Map
        basemap="arcGISTopographic"
        initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
      >
        <MapView style={{ flex: 1 }} onMapLoaded={() => console.log('loaded')} />
      </Map>
    </MapSettings>
  );
}
```

3D works the same way with `<Scene>` + `<SceneView>`. See the **Samples** for each capability.
