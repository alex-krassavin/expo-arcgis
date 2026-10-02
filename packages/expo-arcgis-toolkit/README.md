# expo-arcgis-toolkit

Components from the **ArcGIS Maps SDK Toolkits** ([Swift](https://github.com/Esri/arcgis-maps-sdk-swift-toolkit),
[Kotlin](https://github.com/Esri/arcgis-maps-sdk-kotlin-toolkit)) for [expo-arcgis](https://www.npmjs.com/package/expo-arcgis):
the native Toolkit views, driven by your `<Map>` / `<MapView>` and `<Scene>` / `<SceneView>`.

📖 **[Documentation & samples →](https://mapforge.dev/expo-arcgis)**

## Install

```sh
npx expo install expo-arcgis expo-arcgis-toolkit
```

It builds on expo-arcgis: set that up first (its config plugin, API key and requirements). Then
add this package's config plugin after it and rebuild the native app (`npx expo prebuild --clean`):

```json
{ "expo": { "plugins": ["expo-arcgis", "expo-arcgis-toolkit"] } }
```

The plugin adds what the components need from the app:
- the iOS camera and microphone usage descriptions, for the feature form's attachments and barcodes;
- for `OfflineMapAreas`, the iOS background task identifiers and background fetch, and the Android
  download permissions. On Android 13+, request the notification permission at runtime to see
  download progress.

To word the descriptions yourself, pass `{ "cameraUsageDescription": "…",
"microphoneUsageDescription": "…" }`; `false` leaves one out. `"offlineMapAreas": false` leaves out
what `OfflineMapAreas` needs.

## Components

Components drawn over a view go **inside** its `<MapView>` or `<SceneView>`. Panels are views of
their own, which you lay out:
- A panel for a map, such as `BasemapGallery`, goes anywhere inside the `<Map>`.
- A panel for a view, such as `Bookmarks`, `Legend` or `Search`, goes inside its `<MapView>` /
  `<SceneView>`, over the map.
  It can also go anywhere else, with the view's ref as its `geoView`.

| Component | Kind | iOS | Android |
| --- | --- | --- | --- |
| `Compass` | over a map or scene view | ✓ | ✓ |
| `Scalebar` | over a map view | ✓ | ✓ |
| `OverviewMap` | over a map or scene view | ✓ | — |
| `LocationButton` | over a map view | ✓ | — |
| `FloorFilter` | over a map or scene view (floor-aware data) | ✓ | ✓ |
| `BasemapGallery` | panel for a map | ✓ | ✓ |
| `Bookmarks` | panel for a map or scene view | ✓ | — |
| `BuildingExplorer` | panel for a local scene view | ✓ | — |
| `Legend` | panel for a map or scene view | — | ✓ |
| `FeatureFormView` | panel (a feature from `identify`) | ✓ | ✓ |
| `OfflineMapAreas` | panel for a web map (`<Map portalItem>`) | ✓ | ✓ |
| `PopupView` | panel (a popup from `identifyPopups`) | ✓ | ✓ |
| `Search` | panel for a map or scene view | ✓ | — |
| `UtilityNetworkTrace` | panel for a map view (utility networks) | ✓ | ✓ |

A component the Toolkit has on one platform only renders nothing on the other, and warns once in
development.

```tsx
import { Map, MapView } from 'expo-arcgis';
import { Compass, Scalebar } from 'expo-arcgis-toolkit';

export default function App() {
  return (
    <Map basemap="arcGISTopographic">
      <MapView style={{ flex: 1 }}>
        <Compass />
        <Scalebar units="metric" />
      </MapView>
    </Map>
  );
}
```

A panel bound to a view from outside it:

```tsx
import { Map, MapView, type MapViewHandle } from 'expo-arcgis';
import { Bookmarks } from 'expo-arcgis-toolkit';
import { useRef } from 'react';

export default function App() {
  const mapView = useRef<MapViewHandle>(null);
  return (
    <>
      <Map portalItem={{ itemId: '<web map id>' }}>
        <MapView ref={mapView} style={{ flex: 1 }} />
      </Map>
      <Bookmarks geoView={mapView} style={{ height: 240 }} />
    </>
  );
}
```

## License

MIT © krassavin. See [LICENSE](./LICENSE).
