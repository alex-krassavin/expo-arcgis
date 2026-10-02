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
- `Compass` also works over a `<SceneView>`. Tapping it turns the camera back to north.
- A README and this changelog.

### Fixed

- `BasemapGallery` on iOS shows its alert for a basemap whose spatial reference doesn't match the
  map's.

## 0.1.0

- `Compass`, `Scalebar` and `BasemapGallery`.
