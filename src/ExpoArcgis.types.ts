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

/** Auto-pan behavior for the device location display. */
export type LocationDisplayAutoPanMode = 'off' | 'recenter' | 'navigation' | 'compassNavigation';

/** Device-location display for a `<MapView>`. Providing it enables location (starts the GPS). */
export type LocationDisplay = {
  /** How the view follows the device. Defaults to `recenter`. */
  autoPanMode?: LocationDisplayAutoPanMode;
  /** Whether to draw the location symbol. Defaults to `true`. */
  showLocation?: boolean;
};

/** Props for the `<MapView>` host component. */
export type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Animates the view to this viewpoint whenever the value changes (runtime camera control). */
  viewpoint?: Viewpoint;
  /** Device-location display. When set, the view shows the device's GPS location. */
  locationDisplay?: LocationDisplay;
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

/** Source for a `<FeatureLayer>`'s feature table — a feature service or a local shapefile. */
export type FeatureTableSource =
  | { type: 'service'; url: string }
  | { type: 'shapefile'; path: string };

/**
 * Props for a `<FeatureLayer>` — mirror the native `FeatureLayer`. Provide either `url`
 * (feature-service shorthand) or an explicit `source`.
 */
export type FeatureLayerProps = LayerProps & {
  /** Feature service URL — shorthand for `source: { type: 'service', url }`. */
  url?: string;
  /** Explicit feature-table source (service or local shapefile). */
  source?: FeatureTableSource;
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

/** Props for a `<SceneLayer>` — mirror the native `ArcGISSceneLayer` (3D objects / integrated mesh). */
export type SceneLayerProps = LayerProps & {
  /** URL of the scene service (`.../SceneServer`). */
  url: string;
};

/** Props for a `<VectorTileLayer>` — mirror the native `ArcGISVectorTiledLayer`. */
export type VectorTileLayerProps = LayerProps & { url: string };

/** Props for an `<IntegratedMeshLayer>` (3D) — mirror the native `IntegratedMeshLayer`. */
export type IntegratedMeshLayerProps = LayerProps & { url: string };

/** Props for a `<PointCloudLayer>` (3D) — mirror the native `PointCloudLayer`. */
export type PointCloudLayerProps = LayerProps & { url: string };

/** Props for an `<Ogc3DTilesLayer>` (3D) — mirror the native OGC 3D Tiles layer. */
export type Ogc3DTilesLayerProps = LayerProps & { url: string };

/** Props for a `<WebTiledLayer>` — mirror `WebTiledLayer` (`{level}/{row}/{col}` URL template). */
export type WebTiledLayerProps = LayerProps & { urlTemplate: string };

/** Props for an `<OpenStreetMapLayer>` — the built-in OSM tiles as an operational layer. */
export type OpenStreetMapLayerProps = LayerProps;

/** Props for a `<WmsLayer>` — mirror the native WMS layer (service URL + visible layer names). */
export type WmsLayerProps = LayerProps & { url: string; layerNames: string[] };

/** Props for a `<WmtsLayer>` — mirror the native WMTS layer (service URL + layer id). */
export type WmtsLayerProps = LayerProps & { url: string; layerId: string };

/** Raster source for a `<RasterLayer>`: a remote ArcGIS image service or a local raster file. */
export type RasterSource = { type: 'imageService'; url: string } | { type: 'file'; path: string };

/** Props for a `<RasterLayer>` — mirror the native `RasterLayer` (image service or local raster). */
export type RasterLayerProps = LayerProps & { source: RasterSource };

/** Props for a `<KmlLayer>` — mirror `KMLLayer` (remote `.kml`/`.kmz` URL or local file). */
export type KmlLayerProps = LayerProps & { url: string };

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
  /** Altitude in meters. Used by 3D scenes (camera position, elevated geometries). */
  z?: number;
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/** A multipoint geometry — an unordered collection of points sharing one symbol. */
export type Multipoint = {
  points: Point[];
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/**
 * A polyline geometry — one or more paths. Provide `points` for a single path
 * (shorthand) or `parts` for an explicit multi-path line. Geometry operations
 * (buffer, union, …) return geometries using `parts`.
 */
export type Polyline = {
  /** Vertices of a single path — shorthand for a one-part polyline. */
  points?: Point[];
  /** Explicit paths; each inner array is one path. */
  parts?: Point[][];
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/**
 * A polygon geometry — one or more rings (auto-closed). Provide `points` for a
 * single ring (shorthand) or `parts` for an explicit multi-ring polygon.
 */
export type Polygon = {
  /** Vertices of a single ring — shorthand for a one-part polygon. */
  points?: Point[];
  /** Explicit rings; each inner array is one ring. */
  parts?: Point[][];
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/** An envelope geometry — an axis-aligned bounding box (the extent of other geometries). */
export type Envelope = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  /** Coordinate system WKID. Defaults to `4326` (WGS84). */
  spatialReference?: SpatialReference;
};

/**
 * A geometry value. The `type` discriminator mirrors the ArcGIS web API
 * (`"point"` / `"multipoint"` / `"polyline"` / `"polygon"` / `"envelope"`) and
 * selects the native geometry class.
 */
export type Geometry =
  | ({ type: 'point' } & Point)
  | ({ type: 'multipoint' } & Multipoint)
  | ({ type: 'polyline' } & Polyline)
  | ({ type: 'polygon' } & Polygon)
  | ({ type: 'envelope' } & Envelope);

/** A `point` geometry — convenient alias used where an operation requires a point. */
export type PointGeometry = { type: 'point' } & Point;

// ────────────────────────────────────────────────────────────────────────────
// GeometryEngine — units, curve types and result shapes for spatial operations.
// ────────────────────────────────────────────────────────────────────────────

/** Linear unit for geodesic length/distance/buffer operations. Defaults to `meters`. */
export type LinearUnit = 'meters' | 'kilometers' | 'feet' | 'miles' | 'nauticalMiles' | 'yards';

/** Area unit for geodesic area operations. Defaults to `squareMeters`. */
export type AreaUnit =
  | 'squareMeters'
  | 'squareKilometers'
  | 'squareFeet'
  | 'squareMiles'
  | 'acres'
  | 'hectares';

/** Curve type for geodesic operations. Defaults to `geodesic`. */
export type GeodeticCurveType =
  | 'geodesic'
  | 'loxodrome'
  | 'greatElliptic'
  | 'normalSection'
  | 'shapePreserving';

/** Join style for `geometryEngine.offset`. Defaults to `mitered`. */
export type GeometryOffsetType = 'mitered' | 'bevelled' | 'rounded' | 'squared';

/** Result of `geometryEngine.geodesicDistance` — distance plus the two azimuths (degrees). */
export type GeodeticDistanceResult = {
  distance: number;
  azimuth1: number;
  azimuth2: number;
};

/** Result of `geometryEngine.nearestCoordinate` / `nearestVertex`. */
export type ProximityResult = {
  /** The nearest point on the geometry. */
  coordinate: PointGeometry;
  /** Planar distance from the query point to `coordinate`. */
  distance: number;
};

// ────────────────────────────────────────────────────────────────────────────
// CoordinateFormatter — notation formats for converting points to/from strings.
// ────────────────────────────────────────────────────────────────────────────

/** Latitude-longitude string format. Defaults to `decimalDegrees`. */
export type LatitudeLongitudeFormat =
  | 'decimalDegrees'
  | 'degreesDecimalMinutes'
  | 'degreesMinutesSeconds';

/** UTM string format. Defaults to `latitudeBandIndicators`. */
export type UtmConversionMode = 'latitudeBandIndicators' | 'northSouthIndicators';

/** MGRS string format. Defaults to `automatic`. */
export type MgrsConversionMode =
  | 'automatic'
  | 'new180InZone01'
  | 'new180InZone60'
  | 'old180InZone01'
  | 'old180InZone60';

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

/** A renderer that draws every graphic in an overlay which sets no `symbol` of its own. */
export type SimpleRenderer = { type: 'simple'; symbol: Symbol };

/** Any renderer usable by a `<GraphicsOverlay>`. Mirrors the native `Renderer` hierarchy. */
export type Renderer = SimpleRenderer;

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

/** A 3D camera that defines a scene's viewpoint (position + orientation). */
export type Camera = {
  /** Camera position; `z` is the altitude in meters. */
  position: Point;
  /** Compass heading the camera faces, in degrees. */
  heading?: number;
  /** Tilt from straight down, in degrees (0 = top-down, 90 = horizon). */
  pitch?: number;
  /** Roll, in degrees. */
  roll?: number;
};

/** A tiled elevation service that provides terrain height to a scene's `Surface`. */
export type ElevationSource = { url: string };

/** The ground/elevation surface (terrain) of a 3D `<Scene>`. */
export type Surface = {
  /** Tiled elevation sources stacked to build the terrain. */
  elevationSources?: ElevationSource[];
  /** Vertical exaggeration multiplier (default `1`). */
  elevationExaggeration?: number;
};

/** Props for the `<Scene>` model component — mirror the native ArcGISScene/Scene. */
export type SceneProps = {
  /** Basemap style. Defaults to `arcGISImagery` (3D-appropriate). */
  basemap?: BasemapStyle;
  /** Center + scale applied when the scene first loads. */
  initialViewpoint?: Viewpoint;
  /** 3D camera for the initial view (preferred over `initialViewpoint` for scenes). */
  camera?: Camera;
  /** Ground elevation surface (terrain). */
  surface?: Surface;
  /** Load the scene from an ArcGIS web scene. Construction-only (set once; remount to change). */
  portalItem?: PortalItem;
};

/** Sun lighting mode for a 3D scene view (controls shadows). */
export type SunLighting = 'off' | 'light' | 'lightAndShadows';

/** Atmosphere rendering for a 3D scene view. */
export type AtmosphereEffect = 'off' | 'horizonOnly' | 'realistic';

/** Props for the `<SceneView>` host component. */
export type SceneViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Animates the view to this 3D camera whenever the value changes (runtime camera control). */
  camera?: Camera;
  /** Sun lighting mode (shadows). Defaults to `off`. */
  sunLighting?: SunLighting;
  /** Atmosphere rendering. Defaults to `horizonOnly`. */
  atmosphereEffect?: AtmosphereEffect;
  /** Sun position, as epoch milliseconds (affects shadow direction). */
  sunTime?: number;
  /** Called once the scene has finished loading successfully. */
  onSceneLoaded?: (event: { nativeEvent: MapLoadedEventPayload }) => void;
  /** Called if the scene fails to load. */
  onSceneLoadError?: (event: { nativeEvent: MapLoadErrorEventPayload }) => void;
  /** Called when the user taps the scene. */
  onTap?: (event: { nativeEvent: TapEventPayload }) => void;
};
