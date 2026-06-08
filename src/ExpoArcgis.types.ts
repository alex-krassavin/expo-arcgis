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
  /** How far the location can wander before the view re-pans, as a factor of the symbol size. */
  wanderExtentFactor?: number;
  /**
   * The location data source. `'system'` (device GPS, the default) or a simulated source that
   * drives the location along a `route` polyline — handy for testing without real movement.
   */
  source?: 'system' | { type: 'simulated'; route: Geometry; speed?: number };
};

/** Payload for the `<MapView onLocationChange>` event — one device-location fix. */
export type LocationEventPayload = {
  /** Location in geographic coordinates (WGS84). `z` is altitude in meters when available. */
  position: { latitude: number; longitude: number; z?: number };
  /** Horizontal accuracy radius, in meters. */
  horizontalAccuracy: number;
  /** Vertical accuracy, in meters. */
  verticalAccuracy: number;
  /** Direction of travel, in degrees clockwise from north. */
  course: number;
  /** Speed, in meters per second. */
  speed: number;
  /** Fix time, as epoch milliseconds. */
  timestamp: number;
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
  /** Called on each device-location update (requires `locationDisplay`). */
  onLocationChange?: (event: { nativeEvent: LocationEventPayload }) => void;
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
  /** Overrides the layer's symbology (simple / unique-value / class-breaks). */
  renderer?: Renderer;
  /** Whether the layer's labels are drawn. */
  labelsEnabled?: boolean;
  /** Label rules applied to the layer's features. */
  labels?: LabelDefinition[];
  /** Aggregates dense features into clusters (feature reduction). */
  featureReduction?: FeatureReduction;
};

/** Clustering feature reduction — aggregates nearby features into a single symbol. */
export type ClusterReduction = {
  type: 'cluster';
  /** Renderer for the cluster symbols (e.g. graduated by count). Defaults to a blue circle. */
  renderer?: Renderer;
  /** Cluster cell radius in points. */
  radius?: number;
  /** Smallest cluster symbol size in points. */
  minSymbolSize?: number;
  /** Largest cluster symbol size in points. */
  maxSymbolSize?: number;
  /** Whether reduction is active. Defaults to `true`. */
  enabled?: boolean;
};

/** Feature reduction applied to a `<FeatureLayer>`. Mirrors the native `FeatureReduction`. */
export type FeatureReduction = ClusterReduction;

// ────────────────────────────────────────────────────────────────────────────
// Query — imperative attribute / spatial queries against a `<FeatureLayer>`.
// ────────────────────────────────────────────────────────────────────────────

/** Spatial relationship between the query `geometry` and a feature's geometry. */
export type SpatialRelationship =
  | 'intersects'
  | 'contains'
  | 'crosses'
  | 'disjoint'
  | 'envelopeIntersects'
  | 'equals'
  | 'overlaps'
  | 'touches'
  | 'within'
  | 'relate';

/** A sort clause for a query (`ascending` defaults to `true`). */
export type OrderByField = { field: string; ascending?: boolean };

/** Criteria for a feature query. Mirrors the native `QueryParameters`. */
export type QueryParameters = {
  /** SQL `where` clause (e.g. `POP > 1000000`). */
  whereClause?: string;
  /** Geometry to test against, with `spatialRelationship`. */
  geometry?: Geometry;
  /** Spatial relationship for `geometry`. Defaults to `intersects`. */
  spatialRelationship?: SpatialRelationship;
  /** Maximum number of features to return. */
  maxFeatures?: number;
  /** Whether to include each feature's geometry. Defaults to `true`. */
  returnGeometry?: boolean;
  /** Restrict the query to these object ids. */
  objectIds?: number[];
  /** Sort order of the results. */
  orderBy?: OrderByField[];
  /** Skip this many results (paging). */
  resultOffset?: number;
};

/** A feature returned by a query — its attributes plus (optionally) its geometry. */
export type Feature = {
  attributes: Record<string, unknown>;
  geometry: Geometry | null;
};

/** A statistic to compute over a field. Mirrors the native `StatisticType`. */
export type StatisticType =
  | 'count'
  | 'sum'
  | 'min'
  | 'max'
  | 'average'
  | 'standardDeviation'
  | 'variance';

/** One computed statistic — a `type` over a `field`, optionally renamed via `outName`. */
export type StatisticDefinition = {
  field: string;
  type: StatisticType;
  /** Output column name for the statistic (defaults to a generated name). */
  outName?: string;
};

/** Criteria for a statistics query. Mirrors the native `StatisticsQueryParameters`. */
export type StatisticsQueryParameters = {
  statistics: StatisticDefinition[];
  /** SQL `where` clause limiting which features are aggregated. */
  whereClause?: string;
  /** Fields to group the statistics by (one record per group). */
  groupBy?: string[];
  /** Sort order of the records. */
  orderBy?: OrderByField[];
};

/** One row of a statistics query — the `group` field values plus the computed `statistics`. */
export type StatisticRecord = {
  group: Record<string, unknown>;
  statistics: Record<string, unknown>;
};

/** One layer's hits from a `<MapView>` `identify` (the features under a screen point). */
export type IdentifyResult = {
  /** Name of the layer the features belong to. */
  layerName: string;
  /** Identified features in that layer. */
  features: Feature[];
};

/** Imperative handle exposed by `<MapView>` via `ref`. */
export type MapViewHandle = {
  /**
   * Identifies the features under a screen point (in points, e.g. from `onTap`'s `screenPoint`).
   * Returns one `IdentifyResult` per layer that has hits.
   */
  identify(
    screenPoint: { x: number; y: number },
    options?: { tolerance?: number; maxResults?: number }
  ): Promise<IdentifyResult[]>;
};

/** Imperative query handle exposed by `<FeatureLayer>` via `ref`. */
export type FeatureLayerHandle = {
  /** Returns the features matching `query` (all features when omitted). */
  queryFeatures(query?: QueryParameters): Promise<Feature[]>;
  /** Returns the number of features matching `query`. */
  queryFeatureCount(query?: QueryParameters): Promise<number>;
  /** Returns the combined extent (envelope) of the features matching `query`. */
  queryExtent(query?: QueryParameters): Promise<Geometry | null>;
  /** Computes aggregate statistics over the layer's features. */
  queryStatistics(query: StatisticsQueryParameters): Promise<StatisticRecord[]>;
  /**
   * Adds a feature (attributes + optional geometry) to the layer's table and pushes the edit to
   * the feature service. Resolves to the new feature's object id (or `null` for non-service tables).
   */
  addFeature(attributes: Record<string, unknown>, geometry?: Geometry): Promise<number | null>;
  /** Updates the feature with `objectId` (changed attributes and/or geometry) and pushes the edit. */
  updateFeature(
    objectId: number,
    changes: { attributes?: Record<string, unknown>; geometry?: Geometry }
  ): Promise<void>;
  /** Deletes the feature with `objectId` and pushes the edit. */
  deleteFeature(objectId: number): Promise<void>;
};

/** A label rule for a `<FeatureLayer>` — mirrors the native `LabelDefinition`. */
export type LabelDefinition = {
  /**
   * Label expression. A simple field expression (`[FIELD]`) by default, or an Arcade
   * expression (`$feature.FIELD`) when `useArcade` is set.
   */
  expression: string;
  /** Treat `expression` as an Arcade expression instead of a simple field expression. */
  useArcade?: boolean;
  /** Text symbol for the labels. Defaults to black 12 pt. */
  symbol?: TextSymbol;
  /** Optional SQL `where` clause limiting which features are labeled. */
  whereClause?: string;
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

/** A `polyline` geometry — convenient alias used where an operation returns a line (e.g. a route). */
export type PolylineGeometry = { type: 'polyline' } & Polyline;

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
// Geocoding — address ↔ coordinates search via the `geocoder` namespace.
// ────────────────────────────────────────────────────────────────────────────

/** One geocode/reverse-geocode match. Mirrors the native `GeocodeResult`. */
export type GeocodeResult = {
  /** Human-readable address / place name. */
  label: string;
  /** Point to display for the match (null if the locator returns none). */
  location: PointGeometry | null;
  /** Match confidence, 0–100. */
  score: number;
  /** Result attributes (fields depend on the locator). */
  attributes: Record<string, unknown>;
};

/** Parameters for `geocoder.geocode`. Mirrors the native `GeocodeParameters`. */
export type GeocodeParameters = {
  /** Maximum number of matches to return. */
  maxResults?: number;
  /** Two/three-letter country code to constrain the search. */
  countryCode?: string;
  /** Place categories to filter by (e.g. `['Coffee shop']`). */
  categories?: string[];
  /** A point near which results are preferred. */
  preferredSearchLocation?: PointGeometry;
  /** Locator service URL. Defaults to the ArcGIS World Geocoding Service. */
  locatorUrl?: string;
};

/** Parameters for `geocoder.reverseGeocode`. Mirrors the native `ReverseGeocodeParameters`. */
export type ReverseGeocodeParameters = {
  /** Maximum number of matches to return. */
  maxResults?: number;
  /** Maximum search distance from the point, in meters. */
  maxDistance?: number;
  /** Locator service URL. Defaults to the ArcGIS World Geocoding Service. */
  locatorUrl?: string;
};

/** One autocomplete suggestion. Mirrors the native `SuggestResult`. */
export type SuggestResult = {
  /** Suggested text (a partial completion of the search). */
  label: string;
  /** True when the suggestion is a category/collection rather than a single place. */
  isCollection: boolean;
};

/** Parameters for `geocoder.suggest`. Mirrors the native `SuggestParameters`. */
export type SuggestParameters = {
  /** Maximum number of suggestions to return. */
  maxResults?: number;
  /** Place categories to filter by. */
  categories?: string[];
  /** A point near which suggestions are preferred. */
  preferredSearchLocation?: PointGeometry;
  /** Locator service URL. Defaults to the ArcGIS World Geocoding Service. */
  locatorUrl?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// Routing — directions between stops via the `router` namespace.
// ────────────────────────────────────────────────────────────────────────────

/** One stop along a route. Mirrors the native `Stop` (constructed from a point). */
export type RouteStop = {
  /** The stop location. */
  point: PointGeometry;
  /** Optional label for the stop (echoed back on returned stops). */
  name?: string;
};

/** Parameters for `router.solveRoute`. Mirrors the native `RouteParameters`. */
export type RouteParameters = {
  /**
   * Travel mode name to use, looked up among the service's travel modes
   * (e.g. `'Driving Time'`, `'Walking Time'`). Defaults to the service default.
   */
  travelMode?: string;
  /** Whether to return route geometry/metrics. Defaults to `true`. */
  returnRoutes?: boolean;
  /** Whether to return the (possibly re-sequenced) stops. Defaults to `false`. */
  returnStops?: boolean;
  /** Whether to generate turn-by-turn directions. Defaults to `true`. */
  returnDirections?: boolean;
  /** Language for the generated directions (e.g. `'en'`, `'es'`). Defaults to the service default. */
  directionsLanguage?: string;
  /** Whether the service may reorder stops to find the optimal sequence. Defaults to `false`. */
  findBestSequence?: boolean;
  /** Route service URL. Defaults to the ArcGIS World Route Service. */
  routeServiceUrl?: string;
};

/** One turn-by-turn instruction along a route. Mirrors the native `DirectionManeuver`. */
export type DirectionManeuver = {
  /** Human-readable instruction text. */
  text: string;
  /** Length of this maneuver, in meters. */
  length: number;
  /** Duration of this maneuver, in minutes. */
  duration: number;
  /** Geometry of this maneuver (a line segment, or null). */
  geometry: Geometry | null;
};

/** A single solved route. Mirrors the native `Route`. */
export type Route = {
  /** The route line (null if the service returns none). */
  geometry: PolylineGeometry | null;
  /** Route name (usually derived from the first and last stop). */
  name: string;
  /** Total length of the route, in meters. */
  totalLength: number;
  /** Travel time along the route, in minutes. */
  travelTime: number;
  /** Total elapsed time including any wait/service time, in minutes. */
  totalTime: number;
  /** Turn-by-turn directions (empty unless `returnDirections` is set). */
  directions: DirectionManeuver[];
};

/** Result of `router.solveRoute`. Mirrors the native `RouteResult`. */
export type RouteResult = {
  /** The solved routes (one unless multiple route names / `findBestSequence` are used). */
  routes: Route[];
  /** Informational and warning messages from the solve operation. */
  messages: string[];
};

// ────────────────────────────────────────────────────────────────────────────
// Spatial analysis (visual) — exploratory viewshed / line-of-sight on a `<SceneView>`.
// ────────────────────────────────────────────────────────────────────────────

/** Props for `<AnalysisOverlay>` — a container for visual analyses, hosted by a `<SceneView>`. */
export type AnalysisOverlayProps = {
  /** Whether the overlay's analyses are drawn. Defaults to `true`. */
  visible?: boolean;
};

/**
 * Props for `<Viewshed>` — an exploratory viewshed (visible area from an observer). Mirrors the
 * native `ExploratoryLocationViewshed`. 3D only (rendered in a `<SceneView>`).
 */
export type ViewshedProps = {
  /** Observer location. */
  location: PointGeometry;
  /** Direction the observer faces, in degrees (0 = north, clockwise). */
  heading: number;
  /** Observer pitch, in degrees (0 = horizontal, 90 = straight down). */
  pitch: number;
  /** Horizontal field-of-view angle, in degrees (0–360). */
  horizontalAngle: number;
  /** Vertical field-of-view angle, in degrees (0–180). */
  verticalAngle: number;
  /** Near clipping distance from the observer, in meters. */
  minDistance?: number;
  /** Far clipping distance from the observer, in meters. */
  maxDistance?: number;
  /** Whether to draw the viewshed frustum outline. Defaults to `false`. */
  frustumOutlineVisible?: boolean;
};

/** Whether a line-of-sight target is visible from the observer. */
export type TargetVisibility = 'visible' | 'obstructed' | 'unknown';

/**
 * Props for `<LineOfSight>` — an exploratory line of sight between an observer and a target.
 * Mirrors the native `ExploratoryLocationLineOfSight`. 3D only (rendered in a `<SceneView>`).
 */
export type LineOfSightProps = {
  /** Observer location. */
  observer: PointGeometry;
  /** Target location. */
  target: PointGeometry;
  /** Called when the target's visibility from the observer changes. */
  onTargetVisibilityChange?: (visibility: TargetVisibility) => void;
};

// ────────────────────────────────────────────────────────────────────────────
// Geoprocessing — server-side analysis via the `geoprocessor` namespace.
// ────────────────────────────────────────────────────────────────────────────

/**
 * A single typed input to a geoprocessing tool, mirroring the native `GeoprocessingParameter`
 * subclasses. The `type` discriminator selects the native parameter built from `value`.
 */
export type GeoprocessingInput =
  | { type: 'string'; value: string }
  | { type: 'double'; value: number }
  | { type: 'long'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'linearUnit'; value: number; unit?: LinearUnit }
  | { type: 'features'; geometries: Geometry[] };

/** Result of `geoprocessor.execute`. Mirrors the native `GeoprocessingResult`. */
export type GeoprocessingResult = {
  /**
   * Output parameters keyed by name. Scalars (`string`/`double`/`long`/`boolean`) come back as
   * their JS value; feature outputs come back as `Feature[]`. (Raster outputs are not serialized.)
   */
  outputs: Record<string, unknown>;
};

// ────────────────────────────────────────────────────────────────────────────
// Utility network — load a network and run traces via `<UtilityNetwork>`.
// ────────────────────────────────────────────────────────────────────────────

/** A utility-network trace algorithm. Mirrors the native `UtilityTraceParameters.TraceType`. */
export type UtilityTraceType =
  | 'connected'
  | 'subnetwork'
  | 'upstream'
  | 'downstream'
  | 'isolation'
  | 'loops'
  | 'shortestPath';

/**
 * Describes a starting location for a trace — the network element to begin from, identified by
 * its asset-type path and global id. The native side resolves it to a `UtilityElement`.
 */
export type UtilityElementDescriptor = {
  /** Network source name (e.g. `'Electric Distribution Device'`). */
  networkSource: string;
  /** Asset group name (e.g. `'Circuit Breaker'`). */
  assetGroup: string;
  /** Asset type name (e.g. `'Three Phase'`). */
  assetType: string;
  /** Feature global id (`{...}` UUID string). */
  globalId: string;
};

/** One element returned by a trace. Mirrors the native `UtilityElement`. */
export type UtilityElementInfo = {
  objectId: number;
  globalId: string;
  networkSource: string;
  assetGroup: string;
  assetType: string;
};

/** Result of `UtilityNetwork.trace`. Flattens the native `UtilityElementTraceResult`. */
export type UtilityTraceResult = {
  /** Number of elements found by the trace. */
  elementCount: number;
  /** The elements found by the trace. */
  elements: UtilityElementInfo[];
};

/** Props for `<UtilityNetwork>` — a utility network loaded from a feature service, a child of `<Map>`. */
export type UtilityNetworkProps = {
  /** Feature-service URL of the utility network's service geodatabase. May require `setTokenCredential`. */
  serviceGeodatabaseUrl: string;
  /** Called once the network has loaded, with its name. */
  onLoad?: (name: string) => void;
  /** Called if the network fails to load. */
  onLoadError?: (message: string) => void;
};

/** Imperative handle exposed by `<UtilityNetwork>` via `ref`. */
export type UtilityNetworkHandle = {
  /** Runs a trace of `traceType` from the given starting locations (explicit element descriptors). */
  trace(
    traceType: UtilityTraceType,
    startingLocations: UtilityElementDescriptor[]
  ): Promise<UtilityTraceResult>;
  /**
   * Queries a starting feature from the layer `tableName` (matching `whereClause`), traces from it,
   * and selects the result features on the map. Convenient for an interactive "trace from here" flow.
   */
  traceFromQuery(
    tableName: string,
    whereClause: string,
    traceType: UtilityTraceType
  ): Promise<UtilityTraceResult>;
};

// ────────────────────────────────────────────────────────────────────────────
// GeometryEditor — interactive sketching on a `<MapView>`.
// ────────────────────────────────────────────────────────────────────────────

/** The kind of geometry a `<GeometryEditor>` sketches. */
export type GeometryEditorType = 'point' | 'multipoint' | 'polyline' | 'polygon' | 'envelope';

/**
 * Props for the interactive `<GeometryEditor>` — a child of `<MapView>` that lets the user
 * sketch a geometry. (The native SDK binds the editor to 2D map views only.)
 */
export type GeometryEditorProps = {
  /** The kind of geometry to sketch. */
  type: GeometryEditorType;
  /** When `true` (default) editing is started with `type`; set `false` to stop. */
  active?: boolean;
  /** Called as the sketch geometry changes (`null` when empty / cleared). */
  onGeometryChange?: (geometry: Geometry | null) => void;
};

/** Imperative handle exposed by `<GeometryEditor>` via `ref`. */
export type GeometryEditorHandle = {
  /** Undo the last edit. */
  undo(): void;
  /** Redo the last undone edit. */
  redo(): void;
  /** Clear the current sketch. */
  clear(): void;
  /** Delete the currently selected vertex/part. */
  deleteSelectedElement(): void;
  /** Stop editing and return the final geometry (or `null`). */
  stop(): Geometry | null;
};

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

/** A text symbol that draws a string at a point. Mirrors the native `TextSymbol`. */
export type TextSymbol = {
  type: 'text';
  /** The text to draw. */
  text: string;
  /** Text color as a hex string. Defaults to black. */
  color?: string;
  /** Font size in points. */
  size?: number;
  /** Halo (outline) color as a hex string. */
  haloColor?: string;
  /** Halo width in points. */
  haloWidth?: number;
  /** Font family name. */
  fontFamily?: string;
  /** Horizontal anchor. Defaults to `center`. */
  horizontalAlignment?: 'left' | 'center' | 'right' | 'justify';
  /** Vertical anchor. Defaults to `middle`. */
  verticalAlignment?: 'top' | 'middle' | 'bottom' | 'baseline';
};

/**
 * A 3D marker symbol for point graphics in a `<SceneView>`. Mirrors the native
 * `SimpleMarkerSceneSymbol` (a parametric solid: cone / cube / sphere / …).
 */
export type SimpleMarkerSceneSymbol = {
  type: 'simple-marker-scene';
  /** Solid shape. Defaults to `sphere`. */
  style?: 'cone' | 'cube' | 'cylinder' | 'diamond' | 'sphere' | 'tetrahedron';
  /** Fill color as a hex string. */
  color?: string;
  /** Size along x, in meters. Defaults to 100. */
  width?: number;
  /** Size along z (up), in meters. Defaults to 100. */
  height?: number;
  /** Size along y, in meters. Defaults to 100. */
  depth?: number;
  /** Which part of the solid sits on the point. Defaults to `bottom`. */
  anchor?: 'center' | 'bottom' | 'top' | 'origin';
};

/** Any symbol usable by a `<Graphic>`. Mirrors the native `Symbol` hierarchy. */
export type Symbol =
  | SimpleMarkerSymbol
  | SimpleLineSymbol
  | SimpleFillSymbol
  | TextSymbol
  | SimpleMarkerSceneSymbol;

/** A renderer that draws every feature/graphic with the same `symbol`. */
export type SimpleRenderer = { type: 'simple'; symbol: Symbol };

/** One category of a `UniqueValueRenderer` — the `symbol` for features whose field(s) equal `values`. */
export type UniqueValueInfo = {
  /** Field value(s) (matched in `fields` order) that select this symbol. */
  values: (string | number)[];
  /** Symbol drawn for matching features. */
  symbol: Symbol;
  /** Optional legend label. */
  label?: string;
};

/** Draws features by matching one or more attribute fields against discrete `uniqueValues`. */
export type UniqueValueRenderer = {
  type: 'unique-value';
  /** Attribute field(s) compared against each `UniqueValueInfo.values`. */
  fields: string[];
  uniqueValues: UniqueValueInfo[];
  /** Symbol for features that match no category. */
  defaultSymbol?: Symbol;
  defaultLabel?: string;
};

/** One range of a `ClassBreaksRenderer` — the `symbol` for `min < value ≤ max`. */
export type ClassBreak = {
  min: number;
  max: number;
  symbol: Symbol;
  label?: string;
};

/** Draws features by binning a numeric `field` into `classBreaks` (graduated symbols). */
export type ClassBreaksRenderer = {
  type: 'class-breaks';
  /** Numeric attribute field used to pick a class break. */
  field: string;
  classBreaks: ClassBreak[];
  /** Symbol for features outside all breaks. */
  defaultSymbol?: Symbol;
  defaultLabel?: string;
};

/**
 * Any renderer usable by a `<GraphicsOverlay>` or `<FeatureLayer>`. Mirrors the native
 * `Renderer` hierarchy (`SimpleRenderer` / `UniqueValueRenderer` / `ClassBreaksRenderer`).
 */
export type Renderer = SimpleRenderer | UniqueValueRenderer | ClassBreaksRenderer;

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
