// ArcGIS Maps SDK Toolkit components for expo-arcgis.
//
// Components drawn over a `<MapView>` / `<SceneView>` (place them inside it): Compass, Scalebar
// (maps only), OverviewMap (iOS), LocationButton (iOS, maps only), FloorFilter.
// Panels: BasemapGallery (anywhere inside the `<Map>`); Bookmarks (iOS), BuildingExplorer (iOS,
// local scenes), Legend (Android), Search (iOS) and UtilityNetworkTrace, inside the view, or
// anywhere with the view's ref as `geoView`.
// Authenticator: once, at the root of the app; it prompts when a challenge comes.
export {
  Authenticator,
  type AuthenticatorProps,
  type AuthenticatorHandle,
  type OAuthUserConfiguration,
  type IapConfiguration,
  type IapAuthorizationPromptType,
} from './Authenticator';
export { Compass, type CompassProps } from './Compass';
export { Scalebar, type ScalebarProps, type ScalebarStyle } from './Scalebar';
export { OverviewMap, type OverviewMapProps } from './OverviewMap';
export { LocationButton, type LocationButtonProps } from './LocationButton';
export {
  FloorFilter,
  type FloorFilterProps,
  type FloorFilterSelection,
  type FloorFilterUIProperties,
} from './FloorFilter';
export { BasemapGallery, type BasemapGalleryProps } from './BasemapGallery';
export { jobManager } from './jobManager';
export { Bookmarks, type BookmarksProps, type Bookmark } from './Bookmarks';
export {
  BuildingExplorer,
  type BuildingExplorerProps,
  type BuildingExplorerSelection,
} from './BuildingExplorer';
export { Legend, type LegendProps, type LegendTextStyle } from './Legend';
export {
  FeatureFormView,
  type FeatureFormViewProps,
  type FeatureFormEditingEvent,
} from './FeatureFormView';
export {
  OfflineMapAreas,
  type OfflineMapAreasProps,
  type OfflineMapAreasHandle,
} from './OfflineMapAreas';
export { PopupView, type PopupViewProps } from './PopupView';
export { Search, type SearchProps, type SearchSource } from './Search';
export { UtilityNetworkTrace, type UtilityNetworkTraceProps } from './UtilityNetworkTrace';
export type { AccessoryAlignment } from './types';
