# Changelog

## 0.1.0 — 2026-10-04

The first release. It needs expo-arcgis 0.8.0 or later.

### Added

- `OverviewMap` (iOS): a small map over a `<MapView>` or `<SceneView>` that outlines its visible
  area or marks its center.
- `LocationButton` (iOS): starts a `<MapView>`'s location display and cycles its auto-pan modes.
- `FloorFilter`: browses the sites, facilities and levels of a floor-aware map or scene, shows the
  selected level only, and moves the view to a chosen site or facility. Reports each selection
  (`onSelectionChange`). It takes the Toolkit's own settings: on iOS `automaticSelectionMode`
  (selects by what's in view), `automaticSingleSiteSelectionDisabled` and `levelSelectorWidth`; on
  Android `uiProperties` (colors, button size, which buttons show, how many levels show).
- `Bookmarks` (iOS): lists the bookmarks of a view's map or scene, or the ones given (`bookmarks`),
  and moves the view to the one picked. It reports the pick (`onSelectionChange`) and its requests
  to be hidden (`onIsPresentedChange`). It is a panel bound to a view: place it inside the
  `<MapView>` / `<SceneView>`, or anywhere with the view's ref as `geoView`.
- `Legend` (Android): the symbols of a view's map or scene, its layers' and its basemap's, at the
  view's current scale. It takes the Toolkit's own settings: `reverseLayerOrder`,
  `respectScaleRange`, `title` and `typography`. It is a panel bound to a view, like `Bookmarks`.
  Layers added later, whether declared in JS or loaded with a web map, join it.
- `Search` (iOS): the Swift Toolkit's search panel. It suggests as you type, searches its
  `sources` (the world geocoder by default; locators and smart locators), and moves the view to the
  results. It draws the results into the `<GraphicsOverlay>` whose ref the app passes as
  `resultsOverlay`, as in the SDK.
  - The Toolkit's settings are props: `enableResultListView`, `prompt`, `noResultsMessage`,
    `currentQuery`, `resultMode`, and `onQueryChange`.
  - From the view it is bound to, it can offer "Repeat search here" (`repeatSearch`) and
    prioritize results around the view's center (`queryCenter="view"`, or a fixed point).
- `BuildingExplorer` (iOS): the Swift Toolkit's building explorer, for a `<LocalSceneView>` with
  building scene layers (expo-arcgis's local scene view: in SDK 300 the explorer only supports
  local scenes).
  - It browses levels, construction phases and categories, highlights a level, and its "zoom to
    building" moves the view.
  - It reports the selected building, level and phase (`onSelectionChange`).
  - It is a panel bound to a view, like `Bookmarks`.
- The panels take a ref to any geo view as `geoView`: a `<MapView>`, a `<SceneView>` or a
  `<LocalSceneView>`.
- `UtilityNetworkTrace`: the Toolkit's utility network trace on both platforms (Swift
  `UtilityNetworkTrace`, Kotlin `Trace`), for a map view whose web map has utility networks.
  - It runs their named trace configurations from starting points the user taps on the map, and
    several traces can be compared.
  - As in the SDK, the app provides the `<GraphicsOverlay>` it draws into (`graphicsOverlay`) and
    the map's taps (`mapPoint`, from the `<MapView>`'s `onTap`).
  - It is a panel bound to a view, like `Bookmarks`.
- `FeatureFormView`: the Toolkit's feature form on both platforms. It edits a feature from a
  view's `identify` (`feature={feature.ref}`) with the form its layer defines, using the Toolkit's
  own Save and Discard.
  - It reports them (`onEditingEvent`). Saving keeps the edits on the feature's table. As in the
    Toolkit's examples, the app applies them through `feature.getLayer()`: `applyEdits()` on its
    service geodatabase or on the layer.
  - The Toolkit's settings are props: `validationErrorVisibility`, `isNavigationEnabled`, iOS
    `editingButtons`, Android `showFormActions` and `showCloseIcon`. Its close button reports
    `onDismiss`.
- A config plugin (`"plugins": ["expo-arcgis-toolkit"]`) adds the iOS camera and microphone
  usage descriptions. The feature form needs them for attachments and barcode scanning.
- `jobManager` (iOS): the Swift Toolkit's shared job manager for expo-arcgis's long jobs (the
  `offline` functions' and geoprocessing's `JobRef`s).
  - It keeps the jobs added to it across app launches, gives them background time, and can check
    their status in the background.
  - After a relaunch, `jobs()` hands the kept jobs back.
  - `add`, `remove`, `resumeAllPausedJobs`, `saveState` and `setBackgroundStatusCheckInterval`.
  - It starts at app launch, which its background task requires. The config plugin's
    `"jobManager": true` permits that task.
- `OfflineMapAreas`: the Toolkit's offline map areas on both platforms. It works on the nearest
  `<Map>`'s offline-enabled web map.
  - It downloads its preplanned areas and areas drawn on demand, keeps them on the device, and
    opens one.
  - Opening one hands the offline map out as a `MapRef` (`onSelectionChange`), which the app shows
    in a `<MapView map>`, as `MapView(map: selection ?? onlineMap)` in the SDK.
  - `ref.goOnline()` returns to the web map.
  - iOS: the offline manager starts at app launch, which its background task requires, and the
    SDK's background download session is handed its events on relaunch.
  - The config plugin adds the background task identifiers and background fetch (iOS) and the
    download permissions (Android); `offlineMapAreas: false` leaves them out.
- `PopupView`: the Toolkit's popup view on both platforms. It shows the title, fields, media,
  attachments and related records of a popup from a view's `identifyPopups`
  (`popup={result.ref}`), with expressions evaluated.
  - Its close button reports `onDismiss`; on iOS the button shows only when `onDismiss` is set (the
    Toolkit's `isPresented`).
  - Android's `showCloseIcon` is a prop.
  - It reports the popup it moves to (`onPopupChange`).
- `Authenticator`: the Toolkit's authenticator on both platforms (Swift `Authenticator`, Kotlin
  `AuthenticatorState` with its `DialogAuthenticator`). Mount it once, at the root of the app.
  - While it is mounted, it handles the authentication challenges and shows the Toolkit's
    prompts: a username and password (token, IWA), OAuth sign-in in a browser, IAP sign-in,
    trusting an untrusted host, and picking a client certificate.
  - The Toolkit's settings are props: `oAuthUserConfigurations`, `iapConfigurations`, iOS
    `promptForUntrustedHosts`, and Kotlin's `setAsArcGISAuthenticationChallengeHandler` /
    `setAsNetworkAuthenticationChallengeHandler`, on both platforms.
  - It takes the place of expo-arcgis's challenge handlers and hands them back when it unmounts.
  - Its ref signs out as the Toolkit does (`signOut()`: revokes the OAuth tokens, signs out of the
    IAPs, clears the credential stores). On Android it can also `dismissAll()` the prompts.
  - The config plugin's `oAuthRedirectUris` declares the Kotlin Toolkit's `AuthenticationActivity`
    for the OAuth and IAP redirects (Android).
  - On iOS, a prompt to trust a host needs the host in Info.plist's App Transport Security
    exceptions: ATS rejects it before the SDK can ask.
- Augmented reality views on both platforms (ARKit, ARCore): `TableTopSceneView`, `FlyoverSceneView`
  and `WorldScaleSceneView`, the Toolkits' AR scene views.
  - Each is expo-arcgis's `<SceneView>` shown in AR, through its `container`: its overlays, events,
    identify and ref work. The device's movement controls the camera.
  - The Toolkits' settings are props:
    - TableTop: `anchorPoint`, `translationFactor`, `clippingDistance`; iOS
      `coachingOverlayHidden`; Android `requestCameraPermissionAutomatically`.
    - Flyover: `initialLocation`, `initialHeading` (on iOS, the compass heading when unset),
      `translationFactor`.
    - WorldScale: `clippingDistance`; iOS `trackingMode`, `calibrationViewHidden`,
      `calibrationButtonAlignment` and `onCalibratingChange`; Android `worldScaleTrackingMode` and
      `onTrackingErrorChange`.
    - Android reports `onInitializationStatusChange` for all three.
  - The config plugin's `ar` option adds what they need. On iOS: the camera and location
    descriptions. On Android: the camera and location permissions, and ARCore's entry
    (`arcore: 'optional' | 'required'`, `arcoreApiKey`).
- `FloatingPanel` (iOS): the Swift Toolkit's floating panel, with React content.
  - Place it inside a `<MapView>` / `<SceneView>`: it floats over the view, and touches outside
    the panel reach the map. Elsewhere it floats over the frame it is given, with the view's ref
    as `geoView`.
  - In portrait it rests at the bottom of the view; elsewhere it floats at its top. The user drags
    its handle between detents.
  - The panel decides the content's size, and React lays the content out in it.
  - The Toolkit's settings are props: `isPresented`, `selectedDetent` (`'summary'`, `'half'`,
    `'full'`, a fraction or a height) with `onSelectedDetentChange`, `horizontalAlignment`,
    `maxWidth`, `backgroundColor` and `attributionBarHeight`. The attribution bar height defaults
    to the view's.
- `Compass` also works over a `<SceneView>`. Tapping it turns the camera back to north.
- A README and this changelog.

### Fixed

- The config plugin adds only the Android permissions the manifest doesn't have yet; it used to add
  duplicates of ones another plugin added, such as `POST_NOTIFICATIONS`.
- `BasemapGallery` on iOS shows its alert for a basemap whose spatial reference doesn't match the
  map's.

## 0.1.0

- `Compass`, `Scalebar` and `BasemapGallery`.
