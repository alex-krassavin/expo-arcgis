# Changelog

## Unreleased

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
- `PopupView`: the Toolkit's popup view on both platforms. It shows the title, fields, media,
  attachments and related records of a popup from a view's `identifyPopups`
  (`popup={result.ref}`), with expressions evaluated.
  - Its close button reports `onDismiss`; on iOS the button shows only when `onDismiss` is set (the
    Toolkit's `isPresented`).
  - Android's `showCloseIcon` is a prop.
  - It reports the popup it moves to (`onPopupChange`).
- `Compass` also works over a `<SceneView>`. Tapping it turns the camera back to north.
- A README and this changelog.

### Fixed

- `BasemapGallery` on iOS shows its alert for a basemap whose spatial reference doesn't match the
  map's.

## 0.1.0

- `Compass`, `Scalebar` and `BasemapGallery`.
