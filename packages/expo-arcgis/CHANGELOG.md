# Changelog

## Unreleased

### Added

- For packages built on expo-arcgis (iOS):
  - `JobRef.job` is the native job;
  - `JobRef(restoring:)` makes a handle for a job of a kind the core makes, such as one that
    expo-arcgis-toolkit's `jobManager` restored after a relaunch.
- `<MapView map>`: a map to show instead of the nearest `<Map>`'s, such as an offline map area that
  expo-arcgis-toolkit's `<OfflineMapAreas>` hands out. A `MapRef` can wrap a map that already
  exists, for packages built on expo-arcgis.
- **`<Callout>`: the SDK's callout, with React content.**
  - Place it directly inside a `<MapView>` or `<SceneView>`. It points at a `location`, or at a
    `geoElement` (a `<Graphic>` ref or an identified feature's `ref`) and follows it.
  - Its React children show inside the SDK's own callout (iOS `.callout(placement:)`, Android the
    Toolkit's `Callout` composable), and stay interactive.
  - Settings: `tapLocation`, `offset` and `rotateOffsetWithGeoView`. In a scene, a location's
    `altitude`. Android adds the Kotlin Toolkit's `leaderPosition`, `colors` and `shapes`.
  - A view shows one callout at a time. A `<LocalSceneView>` shows none: the Swift SDK's local scene
    view doesn't support callouts.
- **Identified features and popups by reference.**
  - Each feature in a view's `identify` results carries `ref`: a `FeatureRef`, the native feature.
  - Each `identifyPopups` result carries `ref`: a `PopupRef`, the native popup, with its `title`.
  - Components work on these refs, such as expo-arcgis-toolkit's `<PopupView popup>` and
    `<FeatureFormView feature>`.
  - `featureRef.getLayer()` returns the feature's layer as a `FeatureLayerRef` (`applyEdits()`,
    `getServiceGeodatabase()`), even for a web map's layer.
  - Additive: `IdentifyResult.features` are `IdentifiedFeature`s (a `Feature` plus `ref`), and
    `PopupResult` gains `ref`.
- `<LocalSceneView>`: the SDK's `LocalSceneView`, for a scene whose viewing mode is local, such as a
  local web scene or `<Scene viewingMode="local">`.
  - Like `<SceneView>`, it takes the nearest `<Scene>`, a `camera`, `onSceneLoaded`,
    `onSceneLoadError` and `onTap`. It renders React children above the scene, and it has
    `retryLoad()` and `getCamera()` on its ref.
  - Packages built on expo-arcgis draw over it and bind their panels to it (expo-arcgis-toolkit's
    building explorer). `GeoViewState` carries its `localSceneViewProxy`.
  - The SDK's local scene view has no graphics, image or analysis overlays and no geometry
    editor, so those children do nothing in it.
- `<Scene viewingMode>`: `'global'` (the default) or `'local'`. It applies when the scene is made;
  a web scene brings its own.
- `GeoViewHandle`: the handle of any geo view (`MapViewHandle | SceneViewHandle |
  LocalSceneViewHandle`), which `useGeoViewRef` takes.
- `<SceneView>` shows accessories, as `<MapView>` does: expo-arcgis-toolkit's compass and overview
  map draw over a scene.
- For packages built on expo-arcgis, `GeoViewState` carries more of the view's state:
  - a `<SceneView>`'s proxy, scene and camera;
  - on iOS, a `<MapView>`'s location display;
  - whether the view is navigating;
  - the attribution bar's height.
- For packages built on expo-arcgis that host SwiftUI in their own views (iOS):
  `updateHostingControllerParent(_:)`, which lets the hosting controller present.
- `GeoViewRef`: each `<MapView>` / `<SceneView>` makes one, carrying the view's `GeoViewState`, so
  that the views of packages built on expo-arcgis can bind to it (expo-arcgis-toolkit's panels).
  - Get it with `useGeoViewRef(geoView?)`. It returns the view a `<MapView>` / `<SceneView>` ref
    points to, or else the nearest view.
  - It is also on the views' handles (`MapViewHandle.geoView`, `SceneViewHandle.geoView`).
- `<GraphicsOverlay>` takes a `ref`: its `GraphicsOverlayRef`. Components can draw into it, such
  as expo-arcgis-toolkit's `<Search resultsOverlay>`. On iOS the ref's native `overlay` is public
  for packages built on expo-arcgis (it already was on Android).

### Changed

- `JobRef.result()` doesn't start a job that is already running, such as one a job manager resumed;
  it follows it to its end.
- Accessories along a view's bottom edge stay above its attribution bar.
- Android: where no React child of a `<MapView>` / `<SceneView>` is hit, React Native's touch hit test
  goes on to the map (`box-none`). Touches on content drawn inside the map, such as a callout's,
  reach React. The core now depends on `react-android`, at the app's version, as Expo's own modules
  do.

### Fixed

- iOS: sheets, popovers and alerts from SwiftUI inside a `<MapView>` or `<SceneView>` (the
  toolkit's floor filter site list) show. The view's hosting controller is now a child of the
  screen's view controller, which UIKit presents from.

## 0.7.0 — 2026-10-02

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
