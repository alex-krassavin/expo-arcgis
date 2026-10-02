# Changelog

## Unreleased

### Repository

- The repository is now a monorepo. This package's source moved to `packages/expo-arcgis`, next to
  the packages built on it. What npm ships is unchanged.

### Added

- Extension points for packages built on expo-arcgis, which draw native UI over the map. They are
  additive, so nothing changes for apps.
  - JS: `AccessoryHost` (`addAccessory` / `removeAccessory`), now part of `GeoViewHost`. The nearest
    `<MapView>` renders an accessory, such as a compass or a scalebar, in its own overlay.
    `<SceneView>` doesn't show accessories yet and warns in development.
  - Native: `GeoViewAccessory` and `GeoViewState` on both platforms. `MapRef`'s map is observable
    (`@Published` on iOS, `mapFlow` on Android). On Android, `ComposeHostView` and
    `geoViewComposeHost` are public.

### Changed

- Android: `<MapView>` and `<SceneView>` now render through the ArcGIS Maps SDK for Kotlin Toolkit's
  composable `MapView` / `SceneView` (geoview-compose). Android now has the structure iOS already
  has with the SwiftUI views: a declarative view plus a proxy. Props, events and functions are
  unchanged.
- Android: the core now depends on Jetpack Compose and the Toolkit's `geoview-compose`. Expect roughly
  2–4 MB more APK before R8 shrinking.

### Fixed

- iOS: on React Native 0.88 (Expo SDK 58), pods that depend on ExpoArcgis failed with "module map
  file … not found". React Native's Swift Package support moves our pod's build products but updates
  the module map path only in the app's settings. The config plugin's Podfile `post_install` step
  now updates it in the pods' settings too.
- React Native views inside `<MapView>` or `<SceneView>` render above the map, where their layout
  puts them. On Android they covered the whole view and left the map zero width; on iOS the map
  hid them.
- Android: `getCenter()` returns the centre of the visible map, as on iOS. It used to project the
  view's midpoint, which ignored `contentInsets`.

## 0.6.1 — 2026-10-01

### Added

- Exported the types the public API already used but did not export, so apps can name them —
  type-only, nothing changes at runtime:
  - `MapSettingsProps`;
  - `GeoViewHost`, `GeometryEditorHost`, `AnalysisOverlayHost`, `ImageOverlayHost`;
  - `ExpoArcgisModule`, the type of the default export;
  - the refs `FeatureLayerRef`, `RasterLayerRef`, `PointCloudLayerRef`, `KmlLayerRef`,
    `DynamicEntityLayerRef`, `ServiceGeodatabaseRef`, `AnalysisRef`, `ViewshedRef`,
    `LineOfSightRef`, `GeoElementLineOfSightRef`, `DistanceMeasurementRef`, `AnalysisOverlayRef`,
    `GeometryEditorRef`, `ImageOverlayRef`;
  - their events `JobEvents`, `GeometryEditorEvents`, `DynamicEntityLayerEvents`,
    `LineOfSightEvents`, `DistanceMeasurementEvents`;
  - `PointCloudRendererBase`.

### Changed

- The publish workflow runs on the current actions and Node 24.

## 0.6.0 — 2026-10-01

The first npm release since 0.5.1. It includes the unpublished 0.5.2.

### Breaking

- The peer dependency is now `expo >=56.0.0`. It was `>=54.0.0`, but SDK 54 and 55 had never been
  built. `react` and `react-native` are now `*`, because the Expo SDK pins them. The old
  `react-native >=0.74.0` rejected prereleases, so installing into an SDK 58 beta app failed with
  ERESOLVE.

### Added

- Supports Expo SDK 56, 57 and 58. CI builds the module in a fresh app for each one: Android, iOS,
  and a typecheck plus bundle.
- `getCenter()` on the `<MapView>` ref, from 0.5.2.
- Development builds now warn when a map or scene fails to load and no `onMapLoadError` /
  `onSceneLoadError` handles it. Before, a rejected API key left an empty view and nothing in the
  log: `[expo-arcgis] <MapView> failed to load: Invalid API key. …`

### Fixed

- Android: an unmounted map or scene view never released its GeoView's render thread or GPU
  surface. Its coroutine scope also kept the whole view alive. Both are now released on unmount.
- Empty geometries lost their spatial reference. On Android, geodetic operations then threw,
  starting with the geometry editor's first change.
- iOS: SDK errors came through as "The operation couldn't be completed. (…AuthenticationError error
  4.)" in events and in rejected calls. They now name the error, e.g.
  `ArcGISAuthenticationError.invalidAPIKey`.
- Context errors now name the misplaced component and say how to fix it: an overlay belongs inside
  `<MapView>`, not next to it. Layers show their own names in React's component stacks.
- Moved off deprecated APIs: Kotlin `kotlinOptions`, AGP `lintOptions`, and expo-modules-core
  `deallocate()`.

## 0.5.2 — 2026-09-16 (not published; shipped in 0.6.0)

- `getCenter()` on the `<MapView>` ref.

## 0.5.1 — 2026-08-11

- Android compileSdk 37, as ArcGIS Maps SDK 300.1 requires.

## 0.5.0 — 2026-08-10

- ArcGIS 300.1 features:
  - point cloud renderers and filters;
  - vector-tile identify;
  - `<SceneLayer labelsEnabled>`;
  - `ServiceGeodatabase.refresh`;
  - geometry-editor interaction previews;
  - raster pyramids and `Raster.close`;
  - offline reference basemap;
  - dictionary UI schema;
  - utility trace function and geometry results;
  - `<MapView contentInsets insetsViewpointAdjustment>`;
  - popup media and alt text;
  - shared templates.

## 0.4.0 — 2026-08-10

- ArcGIS Maps SDK 300.1. **The iOS deployment target rises from 17 to 18.**

## 0.3.0 – 0.3.3 — 2026-06-26 … 2026-07-14

- **0.3.3:** iOS build fixes. ArcGIS.framework is embedded before the tail script phases, and a
  duplicate xcframework signature is removed.
- **0.3.2:** `setLicense`, the runtime deployment license.
- **0.3.1:** Android `ModelSceneSymbol` from `file://` paths.
- **0.3.0:**
  - `ModelSceneSymbol`;
  - offline tile-cache estimate;
  - service areas;
  - time extent;
  - raster functions;
  - KML tours (iOS);
  - contingent values;
  - `setAllowUntrustedHosts`.

## 0.2.0 – 0.2.6 — 2026-06-09 … 2026-06-25

- **0.2.6:** Docs only.
- **0.2.5:** Android natively-created refs got the `Constructor` the module needs at startup.
  Detaching on unmount no longer throws `NativeSharedObjectNotFoundException`.
- **0.2.4:** Map and scene views now render on expo-modules-core < 56.0.13. Before, shared objects
  passed as view props never arrived.
- **0.2.3:** The package now ships the compiled config plugin. 0.1.0–0.2.2 shipped an empty
  `plugin/build`.
- **0.2.2:** iOS embeds ArcGIS.framework, so prebuilt apps no longer crash at launch.
- **0.2.1:**
  - `portal.findItems` / `fetchBasemaps`;
  - `KmlLayer.getNodes`;
  - contingent values;
  - `SceneView.getElevation`.
- **0.2.0:**
  - `<ImageOverlay>`;
  - subtype-based editing;
  - polyline and multipoint vector-marker symbol elements.

## 0.1.x — 2026-06-09

- First releases: the declarative `<MapView>` / `<SceneView>` with `<Map>` / `<Scene>`, layers,
  graphics, geometry, query, editing, location, geocoding, routing, analysis, geoprocessing,
  utility networks, offline, real-time and authentication.
