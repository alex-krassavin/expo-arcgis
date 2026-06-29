# expo-arcgis

Native **ArcGIS Maps SDK** for React Native, as an [Expo module](https://docs.expo.dev/modules/overview/).
It wraps the ArcGIS Maps SDK for **Kotlin** (Android) and **Swift** (iOS) and exposes a declarative,
SDK-faithful component API to JS/TS — `<MapView>` / `<SceneView>` with layers, graphics, geometry,
editing, query, analysis, geocoding, routing, geoprocessing, utility networks, offline, real-time and
authentication.

📖 **[Documentation & samples →](https://mapforge.dev/expo-arcgis)**

## Features

| Area | What's covered |
|---|---|
| **2D / 3D** | `<MapView>` + `<Map>`; `<SceneView>` + `<Scene>` (surface, camera, web scenes, light/shadows) |
| **Layers** | Feature, Tile, MapImage, Vector-tile, Raster, WMS, WMTS, KML, Scene, IntegratedMesh, PointCloud, OGC 3D Tiles, WebTiled, OpenStreetMap, WFS, OGC API Features, DynamicEntity (stream), Annotation, Dimension, BuildingScene (3D), OrientedImagery, SubtypeFeature, **Group** (container), **FeatureCollection** (in-memory), **GeoPackage** (local `.gpkg`) |
| **Graphics** | `<GraphicsOverlay>` + `<Graphic>`, symbols (simple marker/line/fill, text, 3D scene symbol, picture-marker), renderers (simple / unique-value / class-breaks), labels, clustering |
| **Geometry** | `geometryEngine` (buffer, project, distance, intersect, …), `coordinateFormatter`, codec for all geometry types |
| **Query** | feature query / count / extent / statistics on a `<FeatureLayer>` ref; `identify` on a view ref |
| **Editing** | add / update / delete features, `<GeometryEditor>` (tools), feature templates |
| **Location** | device location, simulated location data source, `onLocationChange` |
| **Geocoding** | `geocoder.geocode` / `reverseGeocode` / `suggest`, offline `.loc` locators |
| **Routing** | `router.solveRoute` / directions, travel modes, point barriers, curb approach; `router.createRouteTracker` turn-by-turn navigation |
| **Analysis (3D)** | `<AnalysisOverlay>` + `<Viewshed>` / `<LineOfSight>` / `<DistanceMeasurement>` |
| **Geoprocessing** | `geoprocessor.execute` → `JobRef` (progress + cancel), typed parameters |
| **Utility network** | `<UtilityNetwork>` load + trace, named configs, associations, `describeNetwork` |
| **Offline** | `offline.*` generate offline map, preplanned areas, geodatabase, tile / vector-tile export, sync — all as a cancellable `JobRef`; mobile map / scene packages |
| **Real-time** | `<DynamicEntityLayer>` (stream service), query, custom data source, stream filter |
| **Auth** | API key, token (challenge handler), OAuth user sign-in, app credential |

## Requirements

ArcGIS Maps SDK 300.0 sets the floor for any app using this module:

| | Minimum |
|---|---|
| iOS | **17.0**, built with **Xcode 26** |
| Android | **API 28** (Android 9), compileSdk **36** |
| Expo | SDK **54+** (New Architecture). Verified on Expo **56** / RN **0.82** / React **19** |
| Auth | An [ArcGIS API key](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/) (or token / OAuth) |

This is a native module — it does **not** run in Expo Go. Use a development build (`expo prebuild` + `run:ios`/`run:android`).

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
    plugins: [
      ['expo-arcgis', { apiKey: process.env.ARCGIS_API_KEY }],
    ],
  },
};
```

Then regenerate the native projects:

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

## Quick start

The API is declarative and mirrors the ArcGIS SDK object model — a `<Map>` model inside a `<MapView>`
host, wrapped in `<MapSettings>`:

```tsx
import { MapSettings, Map, MapView, FeatureLayer } from 'expo-arcgis';

export function Screen() {
  return (
    <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
      <Map
        basemap="arcGISTopographic"
        initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
      >
        <FeatureLayer url="https://services.arcgis.com/.../FeatureServer/0" />
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

3D works the same way with `<Scene>` + `<SceneView>`. Imperative namespaces don't need a view:

```ts
import { geometryEngine, geocoder } from 'expo-arcgis';

const buffered = geometryEngine.buffer(point, 500, 'meters');
const [hit] = await geocoder.geocode('Los Angeles');
```

## API overview

- **Views & models** — `MapSettings`, `Map`, `Scene`, `MapView`, `SceneView`
- **Layers** — `FeatureLayer`, `TileLayer`, `MapImageLayer`, `SceneLayer`, `VectorTileLayer`,
  `IntegratedMeshLayer`, `PointCloudLayer`, `Ogc3DTilesLayer`, `WebTiledLayer`, `OpenStreetMapLayer`,
  `WmsLayer`, `WmtsLayer`, `RasterLayer`, `KmlLayer`, `WfsLayer`, `OgcFeatureLayer`, `DynamicEntityLayer`,
  `AnnotationLayer`, `DimensionLayer`, `BuildingSceneLayer`, `OrientedImageryLayer`, `SubtypeFeatureLayer`,
  `GroupLayer`, `FeatureCollectionLayer`, `GeoPackageLayer`
- **Graphics & analysis** — `GraphicsOverlay`, `Graphic`, `AnalysisOverlay`, `Viewshed`, `LineOfSight`,
  `DistanceMeasurement`, `GeometryEditor`, `UtilityNetwork`
- **Namespaces** — `geometryEngine`, `coordinateFormatter`, `geocoder`, `router`, `geoprocessor`, `offline`
- **Auth** — `setTokenCredential`, `signInWithOAuth`, `setAppCredential`, `signOut`
- **Hooks** — `useMapSettings`, `useGeoModel`, `useGeoView`, `useGraphicsOverlay`

You can also set the key imperatively: `import ExpoArcgis from 'expo-arcgis'; ExpoArcgis.setApiKey('KEY')`.

## Example app

```sh
cd example
npm install
ARCGIS_API_KEY=your_key npx expo run:android   # or run:ios (needs Xcode 26)
```

## License

MIT © krassavin. See [LICENSE](./LICENSE).
