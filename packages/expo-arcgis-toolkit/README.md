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
rebuild the native app (`npx expo prebuild --clean`).

## Components

Components drawn over a view go **inside** its `<MapView>` or `<SceneView>`. Panels are views of
their own: lay them out anywhere inside the `<Map>`.

| Component | Kind | iOS | Android |
| --- | --- | --- | --- |
| `Compass` | over a map or scene view | ✓ | ✓ |
| `Scalebar` | over a map view | ✓ | ✓ |
| `OverviewMap` | over a map or scene view | ✓ | — |
| `LocationButton` | over a map view | ✓ | — |
| `BasemapGallery` | panel | ✓ | ✓ |

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

## License

MIT © krassavin. See [LICENSE](./LICENSE).
