# expo-arcgis

Native **ArcGIS Maps SDK** rendering for React Native, as an [Expo module](https://docs.expo.dev/modules/overview/).
Wraps the ArcGIS Maps SDK for **Kotlin** (Android) and **Swift** (iOS) and exposes a `MapView` to JS.

> Status: **v1 — minimal MapView** (basemap + initial viewpoint + load events). Pulls ArcGIS **300.0.0**.
> The TypeScript layer and the config plugin are verified; the native bridge still needs an on-device build.

## Requirements

ArcGIS Maps SDK 300.0 sets the floor for any app using this module:

| | Minimum |
|---|---|
| iOS | **17.0**, built with **Xcode 26** |
| Android | **API 28** (Android 9), compileSdk **36** |
| Auth | An [ArcGIS API key](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/) |

## Install

```sh
npm install expo-arcgis
```

Add the config plugin to your app config. It wires the Esri Maven repository (Android), raises
`minSdk`/`compileSdk` and the iOS deployment target, and (optionally) injects your API key.

```js
// app.config.js
module.exports = {
  expo: {
    plugins: [
      ['expo-arcgis', { apiKey: process.env.ARCGIS_API_KEY }],
    ],
  },
};
```

Then regenerate native projects:

```sh
npx expo prebuild --clean
```

### Config plugin options

| Option | Type | Default | Purpose |
|---|---|---|---|
| `apiKey` | `string` | – | Written to `strings.xml` (`arcgis_api_key`) / `Info.plist` (`ArcGISAPIKey`) and read at init. |
| `androidMavenUrl` | `string` | Esri artifactory | Override the ArcGIS Maven repository. |
| `androidMinSdkVersion` | `number` | `28` | Minimum Android SDK. |
| `androidCompileSdkVersion` | `number` | `36` | Android compileSdk. |
| `iosDeploymentTarget` | `string` | `17.0` | Minimum iOS deployment target. |
| `locationWhenInUseUsageDescription` | `string` | – | Opt into location permissions for showing device position. |

## Usage

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
        <MapView
          style={{ flex: 1 }}
          onMapLoaded={() => console.log('loaded')}
          onMapLoadError={(e) => console.warn(e.nativeEvent.message)}
        />
      </Map>
    </MapSettings>
  );
}
```

### Components

- **`<MapSettings config={{ apiKey }}>`** — global ArcGIS settings; applies the API key at runtime (alternative to the config plugin).
- **`<Map basemap initialViewpoint>`** — the map model (mirrors `ArcGISMap`). `basemap` is an `ArcGISBasemapStyle` (11 styles in v1); `initialViewpoint` is `{ latitude, longitude, scale }`.
- **`<MapView style onMapLoaded onMapLoadError>`** — the 2D view host; renders the nearest `<Map>`. `onMapLoadError` provides `e.nativeEvent.message`.

You can also set the key imperatively: `import ExpoArcgis from 'expo-arcgis'; ExpoArcgis.setApiKey('KEY')`.

## Example app

```sh
cd example
npm install
ARCGIS_API_KEY=your_key npx expo run:android   # or run:ios (needs Xcode 26)
```

Without a key the map reports a load error via `onMapLoadError` — useful to confirm the bridge works.

## Roadmap

v1 is the minimal map. Next touch points: tap events + programmatic viewpoint, then operational
layers (feature/tile), then location display.
