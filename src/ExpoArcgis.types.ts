import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Esri basemap styles available out of the box. These map to the native
 * `BasemapStyle` (Kotlin) / `Basemap.Style` (Swift).
 * @see https://developers.arcgis.com/rest/basemap-styles/
 */
export type BasemapStyle =
  | 'arcGISImagery'
  | 'arcGISImageryStandard'
  | 'arcGISTopographic'
  | 'arcGISStreets'
  | 'arcGISStreetsNight'
  | 'arcGISNavigation'
  | 'arcGISNavigationNight'
  | 'arcGISTerrain'
  | 'arcGISLightGray'
  | 'arcGISDarkGray'
  | 'arcGISOceans';

/** A center point and map scale used to position the map. */
export type Viewpoint = {
  latitude: number;
  longitude: number;
  /** Map scale denominator. Smaller = more zoomed in (~72_000 ≈ town, ~10_000_000 ≈ country). */
  scale: number;
};

/**
 * Props for the `<Map>` model component — mirror the configurable properties of the
 * native `ArcGISMap`. Reconciled into the underlying SharedObject via `applyProps`.
 */
export type MapProps = {
  /** Basemap style. Defaults to `arcGISTopographic`. */
  basemap?: BasemapStyle;
  /** Center + scale applied when the map first loads. */
  initialViewpoint?: Viewpoint;
};

export type MapLoadedEventPayload = {
  /** WKID of the loaded map's spatial reference, or null if unavailable. */
  spatialReferenceWkid: number | null;
};

export type MapLoadErrorEventPayload = {
  /** Human-readable description of why the map failed to load. */
  message: string;
};

/** Props for the `<MapView>` host component. */
export type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Called once the map has finished loading successfully. */
  onMapLoaded?: (event: { nativeEvent: MapLoadedEventPayload }) => void;
  /** Called if the map fails to load (e.g. missing or invalid API key). */
  onMapLoadError?: (event: { nativeEvent: MapLoadErrorEventPayload }) => void;
  /** Called when the user taps the map. */
  onTap?: (event: { nativeEvent: TapEventPayload }) => void;
};

/** Common operational-layer props (subset of ArcGIS layer properties). */
export type LayerProps = {
  /** Layer opacity, 0–1. */
  opacity?: number;
  /** Whether the layer is visible. */
  visible?: boolean;
};

/** Props for a `<FeatureLayer>` — mirror the native `FeatureLayer`. */
export type FeatureLayerProps = LayerProps & {
  /** URL of the feature service / feature layer. */
  url: string;
};

/** Props for a `<TileLayer>` — mirror the native `ArcGISTiledLayer`. */
export type TileLayerProps = LayerProps & {
  /** URL of the tiled map service. */
  url: string;
};

/** A geographic point (WGS84). */
export type Point = {
  latitude: number;
  longitude: number;
};

/** Minimal marker symbol for a point graphic (v1 supports points + simple markers). */
export type SimpleMarkerSymbol = {
  /** Fill color as a hex string (e.g. `#ff0000`). */
  color?: string;
  /** Marker size in points. */
  size?: number;
  /** Marker shape. Defaults to `circle`. */
  style?: 'circle' | 'square' | 'cross' | 'diamond' | 'triangle' | 'x';
};

/** Props for a `<Graphic>` — a point with a marker symbol drawn on the map's graphics overlay. */
export type GraphicProps = {
  /** Point geometry (the only geometry supported in v1). */
  point: Point;
  /** Marker symbol for the point. */
  symbol?: SimpleMarkerSymbol;
};

/** Payload for the `<MapView onTap>` event. */
export type TapEventPayload = {
  /** Map location of the tap (WGS84). */
  mapPoint: Point;
  /** Screen location of the tap, in points. */
  screenPoint: { x: number; y: number };
};

/** Props for the `<Scene>` model component — mirror the native ArcGISScene/Scene. */
export type SceneProps = {
  /** Basemap style. Defaults to `arcGISImagery` (3D-appropriate). */
  basemap?: BasemapStyle;
  /** Center + scale applied when the scene first loads. */
  initialViewpoint?: Viewpoint;
};

/** Props for the `<SceneView>` host component. */
export type SceneViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Called once the scene has finished loading successfully. */
  onSceneLoaded?: (event: { nativeEvent: MapLoadedEventPayload }) => void;
  /** Called if the scene fails to load. */
  onSceneLoadError?: (event: { nativeEvent: MapLoadErrorEventPayload }) => void;
  /** Called when the user taps the scene. */
  onTap?: (event: { nativeEvent: TapEventPayload }) => void;
};
