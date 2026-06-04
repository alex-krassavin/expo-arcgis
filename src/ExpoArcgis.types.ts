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

/** Reference to an ArcGIS web map / web scene stored as a portal item. */
export type PortalItem = {
  /** The portal item id (e.g. a web map's item id). */
  itemId: string;
  /** Portal URL. Defaults to `https://www.arcgis.com` (ArcGIS Online, anonymous). */
  portalUrl?: string;
};

/**
 * Props for the `<Map>` model component — mirror the configurable properties of the
 * native `ArcGISMap`. Reconciled into the underlying SharedObject via `applyProps`.
 */
export type MapProps = {
  /** Basemap style. Defaults to `arcGISTopographic`. Ignored when `portalItem` is set. */
  basemap?: BasemapStyle;
  /** Center + scale applied when the map first loads. */
  initialViewpoint?: Viewpoint;
  /** Load the map from an ArcGIS web map. Construction-only (set once; remount to change). */
  portalItem?: PortalItem;
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
  /** Animates the view to this viewpoint whenever the value changes (runtime camera control). */
  viewpoint?: Viewpoint;
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

/** Props for a `<MapImageLayer>` — mirror the native `ArcGISMapImageLayer` (dynamic map service). */
export type MapImageLayerProps = LayerProps & {
  /** URL of the dynamic map service (`.../MapServer`). */
  url: string;
};

// ────────────────────────────────────────────────────────────────────────────
// Geometries — mirror the native `Geometry` types (`Point` / `Polyline` / `Polygon`).
// ────────────────────────────────────────────────────────────────────────────

/** Well-known ID (WKID) of a coordinate system. `4326` = WGS84, `3857` = Web Mercator. */
export type SpatialReference = number;

/**
 * A point geometry — `x` is longitude and `y` is latitude in a geographic spatial
 * reference. Mirrors the native `Point(x:y:spatialReference:)`.
 */
export type Point = {
  x: number;
  y: number;
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/** A polyline geometry — an ordered list of vertices forming a single path. */
export type Polyline = {
  points: Point[];
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/** A polygon geometry — an ordered list of vertices forming a single ring (auto-closed). */
export type Polygon = {
  points: Point[];
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/**
 * A graphic's geometry. The `type` discriminator mirrors the ArcGIS web API
 * (`"point"` / `"polyline"` / `"polygon"`) and selects the native geometry class.
 */
export type Geometry =
  | ({ type: 'point' } & Point)
  | ({ type: 'polyline' } & Polyline)
  | ({ type: 'polygon' } & Polygon);

// ────────────────────────────────────────────────────────────────────────────
// Symbols — mirror `SimpleMarkerSymbol` / `SimpleLineSymbol` / `SimpleFillSymbol`.
// Colors are hex strings: `#RRGGBB` or `#RRGGBBAA` (alpha last).
// ────────────────────────────────────────────────────────────────────────────

export type SimpleMarkerSymbolStyle = 'circle' | 'cross' | 'diamond' | 'square' | 'triangle' | 'x';

export type SimpleLineSymbolStyle = 'solid' | 'dash' | 'dot' | 'dash-dot' | 'dash-dot-dot' | 'none';

export type SimpleFillSymbolStyle =
  | 'solid'
  | 'none'
  | 'horizontal'
  | 'vertical'
  | 'cross'
  | 'diagonal-cross'
  | 'forward-diagonal'
  | 'backward-diagonal';

/** Stroke options shared by `SimpleLineSymbol` and the `outline` of marker/fill symbols. */
export type Stroke = {
  style?: SimpleLineSymbolStyle;
  /** Stroke color as a hex string. */
  color?: string;
  /** Stroke width in points. */
  width?: number;
};

/** A simple marker symbol for point graphics. */
export type SimpleMarkerSymbol = {
  type: 'simple-marker';
  style?: SimpleMarkerSymbolStyle;
  /** Fill color as a hex string (e.g. `#ff3b30`). */
  color?: string;
  /** Marker size in points. */
  size?: number;
  /** Optional outline stroke. */
  outline?: Stroke;
};

/** A simple line symbol for polyline graphics (also used as an `outline`). */
export type SimpleLineSymbol = { type: 'simple-line' } & Stroke;

/** A simple fill symbol for polygon graphics. */
export type SimpleFillSymbol = {
  type: 'simple-fill';
  style?: SimpleFillSymbolStyle;
  /** Fill color as a hex string (e.g. `#ffa50080`). */
  color?: string;
  /** Optional outline stroke. */
  outline?: Stroke;
};

/** Any symbol usable by a `<Graphic>`. Mirrors the native `Symbol` hierarchy. */
export type Symbol = SimpleMarkerSymbol | SimpleLineSymbol | SimpleFillSymbol;

/** Props for a `<Graphic>` — a `geometry` drawn with a `symbol` on the nearest graphics overlay. */
export type GraphicProps = {
  /** Point, polyline, or polygon geometry. */
  geometry: Geometry;
  /** Symbol used to draw the geometry. */
  symbol?: Symbol;
};

/** Payload for the `<MapView onTap>` event. */
export type TapEventPayload = {
  /** Map location of the tap, in geographic coordinates (WGS84). */
  mapPoint: { latitude: number; longitude: number };
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
