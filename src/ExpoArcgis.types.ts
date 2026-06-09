import type { StyleProp, ViewStyle } from 'react-native';

import type { GraphicRef, JobRef } from './ExpoArcgisModule';

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
  /**
   * Language for basemap place-name labels. Only applies when `basemap` is a built-in style string.
   * Special values: `"global"` — English worldwide; `"local"` — local place names;
   * `"default"` — SDK default; `"applicationLocale"` — device locale.
   * Any other value is treated as a BCP-47 language tag (e.g. `"fr"`, `"ar"`, `"zh-Hans"`).
   * Corresponds to `BasemapStyleParameters.language` on both platforms.
   */
  basemapLanguage?: string;
  /**
   * Worldview code for disputed-boundary rendering. Only applies when `basemap` is a built-in style.
   * Known codes: `"CN"`, `"IN"`, `"IL"`, `"JP"`, `"MA"`, `"PK"`, `"KR"`, `"AE"`, `"US"`, `"VN"`.
   * Corresponds to `BasemapStyleParameters.worldview` on both platforms.
   */
  basemapWorldview?: string;
  /**
   * The scale at which feature symbols and text are drawn at their authored size. Features scale
   * relative to this value as the user zooms in and out. Set to `0` (or omit) to disable reference
   * scaling. Maps to `referenceScale` on both platforms.
   */
  referenceScale?: number;
  /**
   * Constrains panning to this envelope — the user cannot scroll the map outside this extent.
   * Must be an `envelope` geometry. Omit (or pass `undefined`) to remove the constraint.
   * Maps to `maxExtent` on both platforms.
   */
  maxExtent?: Geometry;
  /** Center + scale applied when the map first loads. */
  initialViewpoint?: Viewpoint;
  /** Load the map from an ArcGIS web map. Construction-only (set once; remount to change). */
  portalItem?: PortalItem;
  /**
   * Display an offline map from a mobile map package (`.mmpk`) at this local path — e.g. the
   * directory returned by `offline.generateOfflineMap`. The package loads asynchronously and the
   * map appears once ready.
   */
  mobileMapPackagePath?: string;
  /**
   * Named saved viewpoints stored on the map. Replaces the map's bookmark list each time the prop
   * changes. Each entry creates a native `Bookmark(name, Viewpoint(latitude, longitude, scale))`.
   * Navigation to a bookmark is done separately via the `<MapView viewpoint>` prop.
   */
  bookmarks?: { name: string; viewpoint: { latitude: number; longitude: number; scale: number } }[];
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
  /** Coordinate-grid overlay (MGRS / UTM / USNG / latitude-longitude). `null` / omitted = none. */
  grid?: GridConfig | null;
};

/** A coordinate-grid overlay for a `<MapView>` / `<SceneView>`. */
export type GridConfig = {
  /** Grid type: military grid (MGRS), UTM, US National Grid, or latitude-longitude. */
  type: 'mgrs' | 'utm' | 'usng' | 'latitude-longitude';
  /** Whether the grid is drawn. Defaults to `true`. */
  visible?: boolean;
};

/** Common operational-layer props (subset of ArcGIS layer properties). */
export type LayerProps = {
  /** Layer opacity, 0–1. */
  opacity?: number;
  /** Whether the layer is visible. */
  visible?: boolean;
  /**
   * The map scale denominator at which the layer becomes hidden when zooming out (larger number =
   * more zoomed out). A value of `0` means no minimum-scale limit. Example: `2_000_000` hides the
   * layer when the map shows a country-level view.
   */
  minScale?: number;
  /**
   * The map scale denominator at which the layer becomes hidden when zooming in (smaller number =
   * more zoomed in). A value of `0` means no maximum-scale limit. Example: `5_000` hides the layer
   * at street-level zoom.
   */
  maxScale?: number;
};

/** Source for a `<FeatureLayer>`'s feature table — a feature service or a local shapefile. */
export type FeatureTableSource =
  | { type: 'service'; url: string }
  | { type: 'shapefile'; path: string };

/**
 * Styles a `<FeatureLayer>` with a `DictionarySymbolStyle` (military / emergency symbology).
 *
 * Provide either `styleName` (a web-style name hosted on ArcGIS Online, e.g. `"mil2525d"`) or
 * `portalItemUrl` (a direct URL whose `id=` query parameter is used as the portal item id).
 * At least one must be set; `portalItemUrl` takes precedence when both are provided.
 *
 * The style is loaded asynchronously via the SDK's `Loadable` mechanism. The layer's renderer is
 * updated once the load completes. If the load fails the renderer is left unchanged and an error
 * is printed to the native log.
 *
 * @example
 * ```tsx
 * // web style by name — resolves against ArcGIS Online (anonymous)
 * <FeatureLayer url={...} dictionaryRenderer={{ styleName: 'mil2525d' }} />
 *
 * // explicit portal item URL (item id extracted automatically)
 * <FeatureLayer url={...} dictionaryRenderer={{ portalItemUrl: 'https://www.arcgis.com/home/item.html?id=c78b149a1d52414682c86a5feeb13d30' }} />
 * ```
 */
export type DictionaryRendererProp = {
  /**
   * Web-style name (e.g. `"mil2525d"`, `"mil2525c"`, `"app6b"`).
   * Resolved against ArcGIS Online (`https://www.arcgis.com`) as an anonymous portal item.
   * `portalItemUrl` takes precedence when both are set.
   */
  styleName?: string;
  /**
   * Full URL to a portal item hosting the dictionary symbol style.
   * The item id is extracted from the `id=` query-string parameter, e.g.:
   * `https://www.arcgis.com/home/item.html?id=c78b149a1d52414682c86a5feeb13d30`
   * Takes precedence over `styleName` when both are provided.
   */
  portalItemUrl?: string;
};

/**
 * Props for a `<FeatureLayer>` — mirror the native `FeatureLayer`. Provide either `url`
 * (feature-service shorthand) or an explicit `source`.
 */
export type FeatureLayerProps = LayerProps & {
  /** Feature service URL — shorthand for `source: { type: 'service', url }`. */
  url?: string;
  /** Explicit feature-table source (service or local shapefile). */
  source?: FeatureTableSource;
  /**
   * Display a pre-built layer handle instead of constructing one from `url` / `source` — e.g. a
   * table from `ServiceGeodatabaseHandle.getFeatureLayer` (branch versioning) or
   * `GeodatabaseHandle.getFeatureLayer` (local geodatabase transactions). When set, `url` / `source`
   * are ignored; other props (`renderer`, `visible`, …) still apply.
   */
  layer?: FeatureLayerHandle;
  /** Overrides the layer's symbology (simple / unique-value / class-breaks). */
  renderer?: Renderer;
  /**
   * Styles the layer with a `DictionarySymbolStyle` for military / emergency symbology
   * (MIL-STD-2525, APP-6, etc.). Loaded asynchronously; the renderer updates once ready.
   * Mutually exclusive with `renderer` — set one or the other.
   */
  dictionaryRenderer?: DictionaryRendererProp;
  /** Whether the layer's labels are drawn. */
  labelsEnabled?: boolean;
  /** Label rules applied to the layer's features. */
  labels?: LabelDefinition[];
  /** Aggregates dense features into clusters (feature reduction). */
  featureReduction?: FeatureReduction;
  /**
   * Hides features not matching a where-clause on the client — no server round-trip.
   * Set to `null` or omit to clear the filter and show all features.
   */
  displayFilter?: { whereClause: string; name?: string } | null;
  /**
   * Activates different where-clause filters at different map scales — client-side, no server
   * round-trip. Each entry covers a `[minScale, maxScale]` range; `0` means unbounded.
   * Maps to `ScaleDisplayFilterDefinition` on both platforms.
   * Set to `null` or omit to show all features.
   *
   * @example
   * ```tsx
   * scaleDisplayFilter={[
   *   { minScale: 0, maxScale: 100000, whereClause: "TYPE = 'major'" },  // zoomed out
   *   { minScale: 100000, maxScale: 0,  whereClause: "1=1" },            // zoomed in
   * ]}
   * ```
   */
  scaleDisplayFilter?: { minScale?: number; maxScale?: number; whereClause: string }[] | null;
  /**
   * How often (in seconds) the layer automatically re-fetches its features from the service.
   * `0` or omitted disables auto-refresh. Maps to `refreshInterval` (milliseconds) on Android
   * and `refreshInterval: TimeInterval?` (seconds) on iOS.
   */
  refreshInterval?: number;
};

/** One field in a `<FeatureCollectionLayer>` schema. */
export type FeatureCollectionField = {
  /** Field name (used as the attribute key). */
  name: string;
  /** Field data type. */
  type: 'text' | 'int16' | 'integer' | 'long' | 'double' | 'date';
  /** Display alias (defaults to `name`). */
  alias?: string;
  /** Maximum length for `text` fields (default 255). */
  length?: number;
};

/** One in-memory feature for a `<FeatureCollectionLayer>`. */
export type FeatureCollectionFeatureSpec = {
  /** Attribute values keyed by field name. */
  attributes?: Record<string, unknown>;
  /** The feature's geometry. */
  geometry?: Geometry;
};

/**
 * Props for `<FeatureCollectionLayer>` — an in-memory layer built from a client-side schema and
 * features (no feature service). `fields` and `features` are read once at construction; `opacity`,
 * `visible` and `renderer` update reactively.
 */
export type FeatureCollectionLayerProps = LayerProps & {
  /** The collection's field schema. */
  fields: FeatureCollectionField[];
  /** The features (attributes + geometry) to display. */
  features: FeatureCollectionFeatureSpec[];
  /** Optional renderer to symbolize the features. */
  renderer?: Renderer;
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
  /** Sort order of the results (object form with explicit `ascending` flag). */
  orderBy?: OrderByField[];
  /**
   * Sort order of the results as `"FIELD [ASC|DESC]"` strings, e.g. `['POP DESC', 'NAME ASC']`.
   * Parsed into native `OrderBy` objects; appended after any `orderBy` entries.
   * Omitting the direction defaults to ascending.
   */
  orderByFields?: string[];
  /** Skip this many results (paging). */
  resultOffset?: number;
  /**
   * Restrict which attribute fields are returned, e.g. `['NAME', 'POP']`.
   * Pass `['*']` or omit to include all fields (the default).
   * Implemented as a post-query client-side filter on both platforms (the native
   * `QueryParameters` does not expose per-field selection for `queryFeatures`).
   */
  outFields?: string[];
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

/** An evaluated popup from `identifyPopups` — a title plus formatted field label/value pairs. */
export type PopupResult = {
  /** The popup's (evaluated) title. */
  title: string;
  /** Formatted fields, in the layer's popup-definition order. */
  fields: { label: string; value: string }[];
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
  /**
   * Identifies popups under a screen point and evaluates them — returns each popup's title and its
   * formatted fields. Requires the layers to have popups enabled.
   */
  identifyPopups(
    screenPoint: { x: number; y: number },
    options?: { tolerance?: number; maxResults?: number }
  ): Promise<PopupResult[]>;
  /** Retries loading the map after a failure (e.g. a network outage). Re-fires `onMapLoaded`/`onMapLoadError`. */
  retryLoad(): Promise<void>;
  /** Names of the displayed map's bookmarks (e.g. those saved in a loaded web map). */
  getBookmarkNames(): Promise<string[]>;
  /** Navigates to the named bookmark's viewpoint; resolves to whether a matching bookmark was found. */
  setBookmark(name: string): Promise<boolean>;
};

/** Imperative handle exposed by `<SceneView>` via `ref`. */
export type SceneViewHandle = {
  /** Identifies the features under a screen point (3D; in points, e.g. from `onTap`'s `screenPoint`). */
  identify(
    screenPoint: { x: number; y: number },
    options?: { tolerance?: number; maxResults?: number }
  ): Promise<IdentifyResult[]>;
  /** Identifies and evaluates popups under a screen point (3D); returns each popup's title + fields. */
  identifyPopups(
    screenPoint: { x: number; y: number },
    options?: { tolerance?: number; maxResults?: number }
  ): Promise<PopupResult[]>;
  /** Retries loading the scene after a failure (e.g. a network outage). Re-fires `onSceneLoaded`/`onSceneLoadError`. */
  retryLoad(): Promise<void>;
};

/** Imperative query handle exposed by `<FeatureLayer>` via `ref`. */
/** An editing template published with a feature table. Mirrors `FeatureTemplate`. */
export type FeatureTemplate = {
  /** Template name. */
  name: string;
  /** Attribute values a new feature created from this template starts with. */
  prototypeAttributes: Record<string, unknown>;
};

/** Result of one edit applied via `applyEdits`. */
export type EditResult = {
  /** Object id of the edited feature. */
  objectId: number;
  /** Whether the server reported an error for this edit. */
  completedWithErrors: boolean;
};

/** A group of features related to a source feature through one relationship. */
export type RelatedFeaturesResult = {
  /** Id of the relationship these features belong to. */
  relationshipId: number;
  /** The related features. */
  features: Feature[];
};

/** Metadata for a single attachment on an `ArcGISFeature`. */
export type AttachmentInfo = {
  /** Unique identifier for this attachment on the feature. */
  id: number;
  /** File name of the attachment (e.g. `"photo.jpg"`). */
  name: string;
  /** MIME type (e.g. `"image/jpeg"`). */
  contentType: string;
  /** Size in bytes. */
  size: number;
};

export type FeatureLayerHandle = {
  /** Returns the features matching `query` (all features when omitted). */
  queryFeatures(query?: QueryParameters): Promise<Feature[]>;
  /** Returns the number of features matching `query`. */
  queryFeatureCount(query?: QueryParameters): Promise<number>;
  /** Returns the combined extent (envelope) of the features matching `query`. */
  queryExtent(query?: QueryParameters): Promise<Geometry | null>;
  /** Computes aggregate statistics over the layer's features. */
  queryStatistics(query: StatisticsQueryParameters): Promise<StatisticRecord[]>;
  /** Returns the table's editing templates (name + prototype attributes), for building edit UIs. */
  queryFeatureTemplates(): Promise<FeatureTemplate[]>;
  /**
   * Adds a feature (attributes + optional geometry) to the layer's table. By default pushes the
   * edit to the service and resolves to the new object id; pass `apply: false` to make a local-only
   * edit, then batch with `applyEdits`. Resolves to `null` for non-service tables or local edits.
   */
  addFeature(
    attributes: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  /**
   * Creates a feature from the named editing template (so the new feature inherits the template's
   * prototype attributes), then optionally overrides `attributes` on top and sets `geometry`.
   * By default pushes the edit to the service and resolves to the new object id; pass
   * `apply: false` to make a local-only edit. Rejects if no template with that name exists.
   * Requires an ArcGIS feature table (service or mobile geodatabase) — rejects for shapefiles
   * and WFS tables, which do not expose editing templates.
   *
   * @example
   * ```ts
   * const id = await layer.current.addFeatureWithTemplate(
   *   'Residential',
   *   { ADDRESS: '1 Main St' },
   *   { type: 'point', x: -117.19, y: 34.05 }
   * );
   * ```
   */
  addFeatureWithTemplate(
    templateName: string,
    attributes?: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  /**
   * Creates a feature from the named feature subtype (sets the subtype field and inherits the
   * subtype's default attribute values), then optionally overrides `attributes` on top and sets
   * `geometry`. By default pushes the edit to the service and resolves to the new object id;
   * pass `apply: false` to make a local-only edit. Rejects if no subtype with that name exists.
   * Requires an ArcGIS feature table (service or mobile geodatabase) — rejects for shapefiles
   * and WFS tables, which do not expose feature subtypes.
   *
   * @example
   * ```ts
   * const id = await layer.current.addFeatureWithSubtype(
   *   'Arterial',
   *   { ROADNAME: 'Main St' },
   *   { type: 'point', x: -117.19, y: 34.05 }
   * );
   * ```
   */
  addFeatureWithSubtype(
    subtypeName: string,
    attributes?: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  /** Updates the feature with `objectId`. Pass `apply: false` for a local-only edit. */
  updateFeature(
    objectId: number,
    changes: { attributes?: Record<string, unknown>; geometry?: Geometry },
    apply?: boolean
  ): Promise<void>;
  /** Deletes the feature with `objectId`. Pass `apply: false` for a local-only edit. */
  deleteFeature(objectId: number, apply?: boolean): Promise<void>;
  /** Pushes all pending local edits to the service in one batch; resolves to each edit's result. */
  applyEdits(): Promise<EditResult[]>;
  /** Discards all pending local edits made since the last `applyEdits`. */
  undoLocalEdits(): Promise<void>;
  /** Queries features related to `objectId` across all relationships, grouped by relationship. */
  queryRelatedFeatures(objectId: number): Promise<RelatedFeaturesResult[]>;
  /** Returns the metadata for all attachments on the feature with `objectId`. */
  queryAttachments(objectId: number): Promise<AttachmentInfo[]>;
  /**
   * Adds an attachment to the feature with `objectId` and immediately persists the edit.
   * @param name File name (e.g. `"photo.jpg"`).
   * @param contentType MIME type (e.g. `"image/jpeg"`).
   * @param dataBase64 Base64-encoded file contents.
   */
  addAttachment(objectId: number, name: string, contentType: string, dataBase64: string): Promise<void>;
  /**
   * Fetches the binary data for the attachment with `attachmentId` on the feature with `objectId`
   * and returns it as a base64 string.
   */
  fetchAttachment(objectId: number, attachmentId: number): Promise<string>;
  /** Deletes the attachment with `attachmentId` from the feature with `objectId` and persists. */
  deleteAttachment(objectId: number, attachmentId: number): Promise<void>;
  /**
   * Updates the attachment with `attachmentId` on the feature with `objectId` and persists.
   * @param name New file name (e.g. `"photo.jpg"`).
   * @param contentType New MIME type (e.g. `"image/jpeg"`).
   * @param dataBase64 New base64-encoded file contents.
   */
  updateAttachment(objectId: number, attachmentId: number, name: string, contentType: string, dataBase64: string): Promise<void>;
  /**
   * Returns the branch-versioning handle for this layer's service geodatabase (ArcGIS Enterprise
   * branch-versioned services only). Loads the table first; rejects if the layer is not a service
   * feature layer. The same handle is returned on repeat calls.
   */
  getServiceGeodatabase(): Promise<ServiceGeodatabaseHandle>;
};

/** Branch-version access level. */
export type VersionAccess = 'public' | 'protected' | 'private';

/** Metadata for one branch version of a service geodatabase. */
export type ServiceVersionInfo = {
  /** Fully-qualified version name (e.g. `"OWNER.versionName"`). */
  name: string;
  /** Free-text description. */
  description: string;
  /** Who may see / edit the version. */
  access: VersionAccess;
  /** Whether the current user owns this version. */
  isOwner: boolean;
  /** Server-assigned version GUID, when available. */
  versionId?: string;
};

/** Parameters for creating a new branch version. */
export type CreateVersionParams = {
  /** Short version name (the server prefixes the owner). */
  name: string;
  /** Optional description. */
  description?: string;
  /** Access level. Defaults to `"public"`. */
  access?: VersionAccess;
};

/**
 * Handle to a service geodatabase's branch-versioning surface, from
 * `FeatureLayerHandle.getServiceGeodatabase()`. Manages named versions and pushes the service-wide
 * local edits (across every connected table) to the active version. Edit features through the
 * `<FeatureLayer>` handle with `apply: false`, then call `applyEdits()` here to push them — distinct
 * from the table-level `FeatureLayerHandle.applyEdits()`, which pushes only this layer's table.
 */
export type ServiceGeodatabaseHandle = {
  /** Lists all branch versions on the service. */
  fetchVersions(): Promise<ServiceVersionInfo[]>;
  /** Creates a new branch version and resolves with its info. */
  createVersion(params: CreateVersionParams): Promise<ServiceVersionInfo>;
  /** Switches the active version (rejects if there are outstanding local edits). */
  switchVersion(name: string): Promise<void>;
  /** Pushes all connected tables' local edits to the active version in one batch. */
  applyEdits(): Promise<EditResult[]>;
  /** Discards all local edits across connected tables. */
  undoLocalEdits(): Promise<void>;
  /** Whether any connected table has unsaved local edits. */
  hasLocalEdits(): boolean;
  /** The active version's name. */
  getVersionName(): string;
  /** The default version name (e.g. `"sde.DEFAULT"`). */
  getDefaultVersionName(): string;
  /** Whether the service supports branch versioning. */
  supportsBranchVersioning(): boolean;
  /**
   * Returns a `<FeatureLayer layer>`-attachable handle for the service table with `layerId`, bound to
   * the active version — its edits join the version's local edits (pushed by `applyEdits`).
   */
  getFeatureLayer(layerId: number): FeatureLayerHandle;
};

/**
 * A local mobile geodatabase (`.geodatabase` file) opened with `offline.openGeodatabase(path)`. Wrap
 * a batch of edits in `beginTransaction` then `commitTransaction` (persist) or `rollbackTransaction`
 * (discard). Edits target a feature table by name.
 */
export type GeodatabaseHandle = {
  /** Starts a transaction. Subsequent edits are buffered until commit or rollback. */
  beginTransaction(): Promise<void>;
  /** Persists all edits made since `beginTransaction`. */
  commitTransaction(): Promise<void>;
  /** Discards all edits made since `beginTransaction`. */
  rollbackTransaction(): Promise<void>;
  /** Whether a transaction is currently open. */
  isInTransaction(): boolean;
  /** The names of the geodatabase's feature tables. */
  getFeatureTableNames(): string[];
  /** Counts features in `tableName` matching `whereClause` (all when omitted). */
  queryFeatureCount(tableName: string, whereClause?: string): Promise<number>;
  /** Adds a feature to `tableName`; local until the transaction is committed. */
  addFeature(
    tableName: string,
    attributes: Record<string, unknown>,
    geometry?: Geometry
  ): Promise<void>;
  /**
   * Returns a `<FeatureLayer layer>`-attachable handle for `tableName` — display and edit the table
   * on a map; edits join the open transaction.
   */
  getFeatureLayer(tableName: string): FeatureLayerHandle;
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

/** Annotation layer (map text stored as annotation features) from a feature service URL. */
export type AnnotationLayerProps = LayerProps & { url: string };

/** Dimension layer (engineering/measurement dimensions) from a feature service URL. */
export type DimensionLayerProps = LayerProps & { url: string };

/** 3D building scene layer (disciplines + building levels) from a scene service URL. */
export type BuildingSceneLayerProps = LayerProps & { url: string };

/** Oriented imagery layer (photos with position/orientation) from a feature service URL. */
export type OrientedImageryLayerProps = LayerProps & { url: string };

/** Subtype feature layer (one sublayer per subtype) from a feature service URL. */
export type SubtypeFeatureLayerProps = LayerProps & { url: string };

/**
 * Props for a `<GeoPackageLayer>` — displays a feature table from a local `.gpkg` file.
 * The GeoPackage is opened asynchronously; the layer appears once the load completes.
 */
export type GeoPackageLayerProps = LayerProps & {
  /** Absolute path to the local `.gpkg` file. */
  path: string;
  /**
   * Name of the feature table to display. When omitted, the first table in the GeoPackage is used.
   * Construction-only — remount to change.
   */
  tableName?: string;
};

/** WFS (Web Feature Service) layer — a feature layer over `WFSFeatureTable`. */
export type WfsLayerProps = LayerProps & {
  /** WFS service URL. */
  url: string;
  /** Feature type / table name to display (e.g. `'namespace:typeName'`). */
  tableName: string;
};

/** OGC API - Features layer — a feature layer over `OGCFeatureCollectionTable`. */
export type OgcFeatureLayerProps = LayerProps & {
  /** OGC API - Features landing-page URL. */
  url: string;
  /** Collection id to display. */
  collectionId: string;
};

/** Connection state of a real-time `DynamicEntityDataSource`. Mirrors `ConnectionStatus`. */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * The kind of entity lifecycle event emitted by `onDynamicEntityChange`.
 * - `received` — a new or updated entity observation arrived (fires once per entity, not per
 *   observation, so attribute-only updates within the same entity are collapsed).
 * - `purged` — the entity was evicted by the data source's purge rules.
 */
export type DynamicEntityChangeType = 'received' | 'purged';

/**
 * Payload for the `<DynamicEntityLayer onDynamicEntityChange>` event.
 * Contains the entity's current attribute snapshot and geometry at the time of the event.
 */
export type DynamicEntityChange = {
  /** Whether the entity arrived/updated (`received`) or was evicted (`purged`). */
  changeType: DynamicEntityChangeType;
  /** The entity's unique numeric id (from the data source's `entityIDField`). */
  entityId: number;
  /** The entity's current attribute values (snapshot at event time). */
  attributes: Record<string, unknown>;
  /** The entity's current geometry, or `undefined` when unavailable. */
  geometry?: Geometry;
};

/** Track display options for a `<DynamicEntityLayer>` (history of past observations). */
export type TrackDisplay = {
  /** How many past observations to keep per track. */
  maximumObservations?: number;
  /** Whether to draw previous observations (the track line/points). */
  showsPreviousObservations?: boolean;
};

/** Field definition for a custom dynamic-entity data source. */
export type DynamicEntityField = {
  name: string;
  /** Field type. Defaults to `text`. */
  type?: 'text' | 'int32' | 'int64' | 'float64' | 'date';
};

/** Config for a `CustomDynamicEntityDataSource` — push your own observations via `pushObservation`. */
export type CustomDynamicSource = {
  /** Attribute that identifies an entity (observations sharing it form one track). */
  entityIdField: string;
  /** The observation attribute schema. */
  fields: DynamicEntityField[];
};

/**
 * Purge-options for a `<DynamicEntityLayer>` data source — bounds the observation history kept in
 * memory. Mirrors the native `DynamicEntityDataSource.PurgeOptions` (Swift) /
 * `DynamicEntityDataSourcePurgeOptions` (Kotlin).
 *
 * Both fields are optional; omit a field to leave that limit unset (the SDK default is no limit).
 */
export type DynamicEntityPurgeOptions = {
  /**
   * Maximum total number of observations retained across **all** entities.
   * When exceeded, the oldest observations are evicted globally.
   */
  maximumObservations?: number;
  /**
   * Maximum age of observations to retain, in **seconds**.
   * Observations older than this value are evicted automatically.
   * Maps to `maximumDuration` on the native `PurgeOptions` object.
   */
  maximumDuration?: number;
};

/** Props for `<DynamicEntityLayer>` — real-time moving entities from a stream service or custom feed. */
export type DynamicEntityLayerProps = LayerProps & {
  /** Stream service URL (a real-time WebSocket feed of moving entities). */
  streamServiceUrl?: string;
  /** Alternative to `streamServiceUrl`: a custom data source you feed via the ref's `pushObservation`. */
  customSource?: CustomDynamicSource;
  /** Track display (history of past observations). */
  trackDisplay?: TrackDisplay;
  /** Stream-service filter — only entities matching `whereClause` (and/or within `geometry`) stream in. */
  filter?: { whereClause?: string; geometry?: Geometry };
  /**
   * Bounds the observation history kept in memory by the data source. Set either field to limit how
   * many total observations or how much elapsed time the stream retains across all dynamic entities.
   */
  purgeOptions?: DynamicEntityPurgeOptions;
  /** Fired as the data source connects / disconnects. */
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  /**
   * Fired when a dynamic entity is received (new/updated) or purged. High-frequency on busy
   * stream services — only entity lifecycle events are emitted (one per entity arrival or purge),
   * not per-observation attribute updates.
   */
  onDynamicEntityChange?: (event: { nativeEvent: DynamicEntityChange }) => void;
};

/** A live dynamic entity returned by `queryDynamicEntities`. */
export type DynamicEntityInfo = {
  attributes: Record<string, unknown>;
  geometry: Geometry | null;
};

/** A single historical observation returned by `queryObservations`. */
export type DynamicEntityObservationInfo = {
  attributes: Record<string, unknown>;
  geometry?: Geometry;
};

/** Imperative handle exposed by `<DynamicEntityLayer>` via `ref`. */
export type DynamicEntityLayerHandle = {
  /** Returns the data source's currently-tracked dynamic entities. */
  queryDynamicEntities(): Promise<{ count: number; entities: DynamicEntityInfo[] }>;
  /**
   * Returns the observation history for the entity with the given track id, newest first,
   * capped at `max` entries (default 100). Returns an empty array if the entity is not found.
   */
  queryObservations(entityId: string, max?: number): Promise<DynamicEntityObservationInfo[]>;
  /** Pushes an observation into a `customSource` (attributes + geometry). */
  pushObservation(attributes: Record<string, unknown>, geometry: Geometry): void;
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

/** Props for the `<ImageOverlay>` component — a georeferenced image displayed on a `<MapView>`. */
export type ImageOverlayProps = {
  /** Local image file path to display (e.g. a downloaded or bundled PNG/JPEG). */
  imagePath: string;
  /** The geographic extent (envelope) the image is stretched to fill. */
  extent: Envelope;
  /** Overlay opacity, 0–1. Defaults to `1`. */
  opacity?: number;
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

/**
 * Angular unit for geodesic ellipse / sector construction. Defaults to `degrees`.
 * Maps to the native `AngularUnit`.
 */
export type AngularUnit = 'degrees' | 'radians';

/**
 * Output geometry type for `geometryEngine.ellipseGeodesic` / `sectorGeodesic`.
 * Defaults to `polygon`. Maps to the native `GeometryType`.
 */
export type GeodesicGeometryType = 'polygon' | 'polyline' | 'multipoint';

/**
 * Parameters for `geometryEngine.ellipseGeodesic`. Mirrors the native
 * `GeodesicEllipseParameters` (Swift) / `com.arcgismaps.geometry.GeodesicEllipseParameters` (Kotlin).
 */
export type GeodesicEllipseParams = {
  /** Center point of the ellipse. */
  center: PointGeometry;
  /** Length of the semi-major axis. */
  semiAxis1Length: number;
  /** Length of the semi-minor axis. */
  semiAxis2Length: number;
  /**
   * Direction of the major axis, in `angularUnit` clockwise from north. Defaults to `0`.
   */
  axisDirection?: number;
  /** Unit for `axisDirection`. Defaults to `degrees`. */
  angularUnit?: AngularUnit;
  /** Unit for `semiAxis1Length` / `semiAxis2Length`. Defaults to `meters`. */
  linearUnit?: LinearUnit;
  /**
   * Maximum segment length on the output geometry. `0` / omitted lets the SDK choose.
   */
  maxSegmentLength?: number;
  /** Maximum number of vertices on the output geometry. Defaults to `10` (SDK default). */
  maxPointCount?: number;
  /** Output geometry type. Defaults to `polygon`. */
  geometryType?: GeodesicGeometryType;
};

/**
 * Parameters for `geometryEngine.sectorGeodesic`. Extends `GeodesicEllipseParams` with
 * the sector angle and start direction. Mirrors the native `GeodesicSectorParameters`.
 */
export type GeodesicSectorParams = GeodesicEllipseParams & {
  /** The angular size of the sector, in `angularUnit`. */
  sectorAngle: number;
  /** The direction from which the sector opens, in `angularUnit` clockwise from north. */
  startDirection: number;
};

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
  /**
   * Structured address fields for multi-field geocoding (e.g.
   * `{ Address: "380 New York St", City: "Redlands", Region: "CA", Postal: "92373" }`).
   * When provided, the SDK's multi-field overload is used instead of the single-line text
   * search. Field names must match the locator's input fields (the World Geocoder accepts
   * `Address`, `Address2`, `Address3`, `City`, `Region`, `Postal`, `PostalExt`, `CountryCode`).
   * If both `searchValues` and `searchText` are supplied, `searchValues` takes precedence.
   */
  searchValues?: Record<string, string>;
  /** Maximum number of matches to return. */
  maxResults?: number;
  /**
   * Attribute names to include on each result (e.g. `['*']` for all, or
   * `['Match_addr', 'City', 'Region']` for a specific subset). When omitted the locator
   * returns its default set.
   */
  resultAttributeNames?: string[];
  /**
   * WKID of the spatial reference for returned locations (e.g. `3857` for Web Mercator,
   * `4326` for WGS84). When omitted the locator returns coordinates in its own SR.
   */
  outputSpatialReference?: number;
  /** Two/three-letter country code to constrain the search. */
  countryCode?: string;
  /** Place categories to filter by (e.g. `['Coffee shop']`). */
  categories?: string[];
  /** A point near which results are preferred. */
  preferredSearchLocation?: PointGeometry;
  /**
   * Locator to use. An online geocode-service URL, or a local path to an offline locator
   * (`.loc`) for disconnected geocoding. Defaults to the ArcGIS World Geocoding Service.
   */
  locatorUrl?: string;
};

/** Parameters for `geocoder.reverseGeocode`. Mirrors the native `ReverseGeocodeParameters`. */
export type ReverseGeocodeParameters = {
  /** Maximum number of matches to return. */
  maxResults?: number;
  /** Maximum search distance from the point, in meters. */
  maxDistance?: number;
  /**
   * Locator to use. An online geocode-service URL, or a local path to an offline locator
   * (`.loc`) for disconnected geocoding. Defaults to the ArcGIS World Geocoding Service.
   */
  locatorUrl?: string;
};

/** One autocomplete suggestion. Mirrors the native `SuggestResult`. */
export type SuggestResult = {
  /** Suggested text (a partial completion of the search). */
  label: string;
  /** True when the suggestion is a category/collection rather than a single place. */
  isCollection: boolean;
  /**
   * Opaque integer key that identifies the native `SuggestResult` held in the module registry.
   * Pass to `geocoder.geocodeSuggestion(suggestionId)` to resolve the selection precisely —
   * the SDK's `geocode(forSuggestResult:)` / `geocode(suggestResult)` overload avoids a text
   * re-search and returns the exact match the user picked.
   * The registry is replaced on each new `suggest` call; ids from a prior call are no longer valid.
   */
  suggestionId: number;
};

/** Parameters for `geocoder.suggest`. Mirrors the native `SuggestParameters`. */
export type SuggestParameters = {
  /** Maximum number of suggestions to return. */
  maxResults?: number;
  /** Place categories to filter by. */
  categories?: string[];
  /** A point near which suggestions are preferred. */
  preferredSearchLocation?: PointGeometry;
  /**
   * Locator to use. An online geocode-service URL, or a local path to an offline locator
   * (`.loc`) for disconnected geocoding. Defaults to the ArcGIS World Geocoding Service.
   */
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
  /** Which side of the vehicle the stop should be approached from. */
  curbApproach?: 'eitherSide' | 'leftSide' | 'rightSide' | 'noUTurn';
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
  /** Point barriers — locations the route must avoid (e.g. road closures). */
  barriers?: PointGeometry[];
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

/** A device location fed to a `RouteTracker` (e.g. from `<MapView>`'s `onLocationChange`). */
export type TrackedLocation = {
  latitude: number;
  longitude: number;
  /** Speed in m/s (optional). */
  speed?: number;
  /** Heading in degrees (optional). */
  course?: number;
};

/** Navigation status returned by `RouteTrackerHandle.trackLocation`. */
export type RouteTrackingStatus = {
  /** Distance remaining on the route, in meters. */
  distanceRemaining: number;
  /** Time remaining on the route, in minutes. */
  timeRemaining: number;
  /** Index of the current maneuver in the route's directions. */
  currentManeuverIndex: number;
  /** Number of destinations still to reach. */
  remainingDestinationCount: number;
  /** Destination status (e.g. `notReached`, `approaching`, `reached`). */
  destinationStatus: string;
  /** Voice-guidance text for the current maneuver (empty when none). */
  voiceText: string;
};

/**
 * Turn-by-turn navigation handle from `router.createRouteTracker`. Feed it device locations with
 * `trackLocation` (typically from `<MapView>`'s `onLocationChange`); each call advances navigation
 * and resolves with the current status. Call `switchToNextDestination` after reaching a stop.
 */
export type RouteTrackerHandle = {
  trackLocation(location: TrackedLocation): Promise<RouteTrackingStatus>;
  switchToNextDestination(): Promise<void>;
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

/**
 * Props for a GeoElement-anchored `<Viewshed>` — the viewshed follows a `<Graphic>` as it moves.
 * Mirrors the native `ExploratoryGeoElementViewshed`. 3D only (rendered in a `<SceneView>`).
 * Use instead of `ViewshedProps` when you want the observer to track a graphic's position.
 */
export type GeoElementViewshedProps = {
  /** Horizontal field-of-view angle, in degrees (0–360). */
  horizontalAngle: number;
  /** Vertical field-of-view angle, in degrees (0–180). */
  verticalAngle: number;
  /** Heading offset from the graphic's heading, in degrees. */
  headingOffset: number;
  /** Pitch offset from the graphic's pitch, in degrees. */
  pitchOffset: number;
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

/**
 * Props for a GeoElement-anchored `<LineOfSight>` — both the observer and the target follow
 * `<Graphic>`s as they move. Mirrors the native `ExploratoryGeoElementLineOfSight`. 3D only
 * (rendered in a `<SceneView>`). Use instead of `LineOfSightProps` when both endpoints track
 * graphics rather than fixed points.
 */
export type GeoElementLineOfSightProps = {
  /** Called when the target's visibility from the observer changes. */
  onTargetVisibilityChange?: (visibility: TargetVisibility) => void;
};

/** Direct / horizontal / vertical distance (in the measurement's unit, default meters). */
export type DistanceMeasurementResult = {
  directDistance: number;
  horizontalDistance: number;
  verticalDistance: number;
};

export type DistanceMeasurementProps = {
  /** Start point of the measurement. */
  startLocation: PointGeometry;
  /** End point of the measurement. */
  endLocation: PointGeometry;
  /** Called as the measured distances change. */
  onMeasurementChange?: (measurement: DistanceMeasurementResult) => void;
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
  | { type: 'date'; value: number }
  | { type: 'linearUnit'; value: number; unit?: LinearUnit }
  | { type: 'features'; geometries: Geometry[] }
  /** An array of homogeneous strings or numbers — maps to `GeoprocessingMultiValue`. */
  | { type: 'multiValue'; values: (string | number)[] }
  /**
   * A data-file input — maps to `GeoprocessingDataFile`.
   * Provide exactly one of `url` (remote service URL) or `filePath` (absolute local path).
   */
  | { type: 'dataFile'; url: string; filePath?: never }
  | { type: 'dataFile'; filePath: string; url?: never };

/** A raster output from a geoprocessing tool. Mirrors `GeoprocessingRaster`. */
export type GeoprocessingRasterOutput = {
  type: 'raster';
  /** Remote raster URL (set by the service for output rasters). */
  url?: string;
  /** Absolute local file path (set when the output raster is a local file). */
  filePath?: string;
};

/** Result of `geoprocessor.execute`. Mirrors the native `GeoprocessingResult`. */
export type GeoprocessingResult = {
  /**
   * Output parameters keyed by name. Scalars (`string`/`double`/`long`/`boolean`) come back as
   * their JS value; feature outputs come back as `Feature[]`; raster outputs come back as
   * `GeoprocessingRasterOutput`.
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

/** A predefined trace configuration published with the network. Mirrors `UtilityNamedTraceConfiguration`. */
export type UtilityNamedTraceConfiguration = {
  name: string;
  globalId: string;
};

/** One terminal in a `UtilityTerminalConfiguration`. Mirrors the native `UtilityTerminal`. */
export type UtilityTerminal = {
  /** Terminal name (e.g. `'High'`, `'Low'`). */
  name: string;
  /**
   * Whether the terminal is the upstream terminal for the asset type.
   * Tracing upstream vs. downstream from a junction uses this to select the correct terminal.
   */
  isUpstream: boolean;
};

/**
 * A terminal configuration defined in the network. Mirrors `UtilityTerminalConfiguration`.
 * Devices such as transformers have multiple terminals (e.g. high-side / low-side).
 * Knowing the available terminals is a prerequisite for specifying a `terminal` on a
 * `UtilityElement` when starting a directional trace.
 */
export type UtilityTerminalConfiguration = {
  /** Configuration name (e.g. `'Transformer'`). */
  name: string;
  /** The terminals belonging to this configuration. */
  terminals: UtilityTerminal[];
};

/** Summary of an element's associations. Flattens the native `UtilityAssociation` list. */
export type UtilityAssociationSummary = {
  /** Number of associations found. */
  count: number;
  /** Distinct association kinds present (`connectivity` / `containment` / `attachment` / `junctionEdge`). */
  kinds: string[];
};

/** Imperative handle exposed by `<UtilityNetwork>` via `ref`. */
/** Topology state of a utility network (from `getState`). */
export type UtilityNetworkState = {
  /** Whether the network has dirty areas pending validation. */
  hasDirtyAreas: boolean;
  /** Whether the network topology has errors. */
  hasErrors: boolean;
  /** Whether network topology is enabled. */
  networkTopologyEnabled: boolean;
};

export type UtilityNetworkHandle = {
  /** Returns metadata about the loaded network (its network-source names). */
  describeNetwork(): { networkSources: string[] };
  /**
   * Returns the terminal configurations defined in the network.
   * Use this to discover the available terminals on multi-terminal devices (e.g. transformers)
   * before starting a directional trace that must specify a terminal. Synchronous — no network
   * round-trip; reads from the already-loaded network definition.
   */
  getTerminalConfigurations(): UtilityTerminalConfiguration[];
  /** Returns the network's topology state — dirty areas, errors, and whether topology is enabled. */
  getState(): Promise<UtilityNetworkState>;
  /**
   * Validates the network topology over `extent` (an envelope geometry). Returns a `JobRef` —
   * call `.result()` to run it (and track `onProgress`), or `.cancel()`. After it completes, read
   * `getState()` to see whether errors or dirty areas remain.
   */
  validateNetworkTopology(extent: Geometry): JobRef<{ validated: boolean }>;
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
  /** Lists the network's predefined named trace configurations. */
  queryNamedTraceConfigurations(): Promise<UtilityNamedTraceConfiguration[]>;
  /** Traces using a named configuration (by `globalId`), from a feature queried from `tableName`. */
  traceWithConfiguration(
    configGlobalId: string,
    tableName: string,
    whereClause: string
  ): Promise<UtilityTraceResult>;
  /** Returns the associations of a feature queried from `tableName`. */
  associations(tableName: string, whereClause: string): Promise<UtilityAssociationSummary>;
};

// ────────────────────────────────────────────────────────────────────────────
// Offline — take maps and data offline (downloads to disk) via the `offline` namespace.
// ────────────────────────────────────────────────────────────────────────────

/** Result of an offline-map download. `path` is the local mobile map package directory. */
export type OfflineMapResult = {
  /** Local filesystem path of the downloaded mobile map package (pass to `<Map mobileMapPackagePath>`). */
  path: string;
};

/** A preplanned offline map area published with a web map. Mirrors `PreplannedMapArea`. */
export type PreplannedMapAreaInfo = {
  /** Area title. */
  title: string;
  /** Index into the web map's preplanned areas (pass to `offline.downloadPreplannedOfflineMap`). */
  index: number;
};

/** Result of a geodatabase download. Mirrors the generated `Geodatabase`. */
export type OfflineGeodatabaseResult = {
  /** Local filesystem path of the downloaded `.geodatabase`. */
  path: string;
  /** Number of feature tables in the geodatabase. */
  tableCount: number;
};

/** Result of a tile-cache / vector-tiles export. */
export type OfflineTileResult = {
  /** Local filesystem path of the downloaded tile package (`.tpkx` / `.vtpk`). */
  path: string;
};

/** Result of `offline.estimateTileCacheSize` — an estimate of the download footprint. */
export type TileCacheSizeEstimate = {
  /** Estimated on-disk size of the tile cache in bytes. */
  fileSize: number;
  /** Estimated number of tiles in the tile cache. */
  tileCount: number;
};

/**
 * Overrides for `offline.generateOfflineMap` that narrow the tile-cache scale range, producing a
 * smaller download. Both values follow the ArcGIS scale convention (larger number = more zoomed
 * out; 0 means "no limit" on that end).
 *
 * Applied via `GenerateOfflineMapParameterOverrides`: each `ExportTileCacheParameters` entry in
 * the overrides object has its `levelIDs` list trimmed to the subset that falls within
 * [minScale, maxScale]. Vector-tile entries are not affected (the SDK exposes no per-entry scale
 * filter for `ExportVectorTilesParameters`).
 */
export type OfflineMapParameterOverrides = {
  /**
   * Coarsest scale to include (outermost/lowest-detail level). 0 = no coarse limit.
   * E.g. `100000` keeps levels finer than 1:100 000.
   */
  minScale?: number;
  /**
   * Finest scale to include (innermost/highest-detail level). 0 = no fine limit.
   * E.g. `5000` drops levels finer than 1:5 000, meaningfully reducing download size.
   */
  maxScale?: number;
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
/** Interaction tool for the geometry editor. Mirrors `VertexTool`/`FreehandTool`/`ShapeTool`. */
export type GeometryEditorTool =
  | 'vertex'
  | 'freehand'
  | 'reticleVertex'
  | 'arrow'
  | 'ellipse'
  | 'rectangle'
  | 'triangle';

export type GeometryEditorProps = {
  /** The kind of geometry to sketch. */
  type: GeometryEditorType;
  /** When `true` (default) editing is started with `type`; set `false` to stop. */
  active?: boolean;
  /** Interaction tool (default `vertex`). Shape tools (`arrow`/`ellipse`/…) sketch by dragging. */
  tool?: GeometryEditorTool;
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

/** A marker drawn from an image at a URL. Mirrors `PictureMarkerSymbol`. */
export type PictureMarkerSymbol = {
  type: 'picture-marker';
  /** Image URL (remote `http(s)` or a local file URL). */
  url: string;
  /** Display width in points (defaults to the image's intrinsic size). */
  width?: number;
  /** Display height in points (defaults to the image's intrinsic size). */
  height?: number;
};

/** A polygon fill drawn by tiling an image from a URL. Mirrors `PictureFillSymbol`. */
export type PictureFillSymbol = {
  type: 'picture-fill';
  /** Image URL (remote `http(s)` or a local file URL). */
  url: string;
  /** Tile width in points (defaults to the image's intrinsic size). */
  width?: number;
  /** Tile height in points (defaults to the image's intrinsic size). */
  height?: number;
  /** Optional outline stroke. */
  outline?: Stroke;
};

/**
 * One range within a `DistanceCompositeSceneSymbol` — the `symbol` rendered while the camera
 * distance to the graphic falls within `[minDistance, maxDistance]`. Use `0` for `maxDistance`
 * to make the range unbounded (no far limit). Mirrors the native `DistanceSymbolRange`.
 */
export type DistanceSymbolRange = {
  /** The symbol drawn while within this distance band. */
  symbol: Symbol;
  /** Near camera-distance limit, in meters. */
  minDistance?: number;
  /** Far camera-distance limit, in meters. `0` / omitted = unbounded. */
  maxDistance?: number;
};

/**
 * A 3D composite symbol that swaps its appearance based on camera distance.
 * Each range specifies a `symbol` visible within a `[minDistance, maxDistance]` band.
 * Mirrors the native `DistanceCompositeSceneSymbol`. Only valid in a `<SceneView>`.
 */
export type DistanceCompositeSceneSymbol = {
  type: 'distance-composite-scene';
  ranges: DistanceSymbolRange[];
};

/**
 * A composite symbol that overlays multiple symbols stacked on top of each other.
 * Useful for combining a marker with a label, or layering two markers for a ring effect.
 * Mirrors the native `CompositeSymbol`.
 *
 * @example
 * ```ts
 * { type: 'composite', symbols: [
 *   { type: 'simple-marker', color: '#fff', size: 18 },
 *   { type: 'simple-marker', color: '#e63946', size: 10 },
 * ] }
 * ```
 */
export type CompositeSymbolType = {
  type: 'composite';
  /** The symbols to stack, drawn in order (first = bottom, last = top). */
  symbols: Symbol[];
};

/**
 * One picture-marker symbol layer within a `MultilayerPointSymbolType`.
 * Mirrors the native `PictureMarkerSymbolLayer`.
 *
 * NOTE: `size` sets a uniform size (overrides `width`/`height` when all three are supplied).
 * `width` and `height` are applied in order, so supplying both sets size to the last one;
 * use `size` for a uniform value. `offsetX`/`offsetY` shift the layer in points.
 */
export type PictureMarkerSymbolLayerSpec = {
  type: 'picture-marker';
  /** Image URL (remote `http(s)` or a local file URL). */
  url: string;
  /** Uniform size in points (sets both width and height). */
  size?: number;
  /** Display width in points. */
  width?: number;
  /** Display height in points. */
  height?: number;
  /** Horizontal offset of the layer, in points. */
  offsetX?: number;
  /** Vertical offset of the layer, in points. */
  offsetY?: number;
};

/**
 * One vector-marker symbol layer within a `MultilayerPointSymbolType`.
 * Mirrors the native `VectorMarkerSymbolLayer` (a shape drawn from a geometry with fill/stroke,
 * requiring no image).
 *
 * Supported `geometry` types and how they are symbolised:
 * - `polygon` — `MultilayerPolygonSymbol([SolidFillSymbolLayer, SolidStrokeSymbolLayer?])`;
 *   `fillColor` is the fill, `outlineColor`/`outlineWidth` add an optional stroke.
 * - `polyline` — `MultilayerPolylineSymbol([SolidStrokeSymbolLayer])`; `fillColor` is used as the
 *   stroke color (falls back to `outlineColor`, then red), `outlineWidth` sets the stroke width.
 * - `multipoint` — `MultilayerPointSymbol([SolidFillSymbolLayer, SolidStrokeSymbolLayer?])`;
 *   same color/width props as `polygon`.
 *
 * Any other `geometry` type is silently skipped (the layer is omitted from the symbol).
 * Geometries use a local coordinate space (not geographic) — use small integer-scale coordinates
 * (e.g. `x` / `y` in the range `[-1, 1]`).
 *
 * @example — filled triangle (polygon)
 * ```ts
 * { type: 'multilayer-point', symbolLayers: [
 *   { type: 'vector-marker', size: 24,
 *     geometry: { type: 'polygon', points: [
 *       { x: -1, y: -1 }, { x: 0, y: 1 }, { x: 1, y: -1 },
 *     ] },
 *     fillColor: '#e63946', outlineColor: '#1d3557', outlineWidth: 1 },
 * ] }
 * ```
 */
export type VectorMarkerSymbolLayerSpec = {
  type: 'vector-marker';
  /**
   * The geometry that defines the marker shape. Supported types: `polygon`, `polyline`,
   * `multipoint`. Unsupported types are silently skipped. The geometry is defined in a local
   * coordinate space (not geographic) — use small integer-scale coordinates
   * (e.g. `x` / `y` in the range `[-1, 1]`).
   */
  geometry: Geometry;
  /** Overall size of the marker, in points. Scales the geometry uniformly. Defaults to 12. */
  size?: number;
  /** Fill color as a `#RRGGBB` / `#RRGGBBAA` hex string. Defaults to red. */
  fillColor?: string;
  /** Outline stroke color as a `#RRGGBB` / `#RRGGBBAA` hex string. Omit to suppress outline. */
  outlineColor?: string;
  /** Outline stroke width in points. Defaults to 1. */
  outlineWidth?: number;
};

/** Union of all supported symbol layer kinds within a `MultilayerPointSymbolType`. */
export type SymbolLayerSpec = PictureMarkerSymbolLayerSpec | VectorMarkerSymbolLayerSpec;

/**
 * A multilayer point symbol composed of one or more symbol layers.
 * Mirrors the native `MultilayerPointSymbol`. Useful for rich point icons built from stacked
 * picture images or vector shapes (e.g. a filled triangle marker, or a pin body + badge).
 *
 * Supported layer kinds: `picture-marker` and `vector-marker`.
 *
 * @example — picture marker
 * ```ts
 * { type: 'multilayer-point', symbolLayers: [
 *   { type: 'picture-marker', url: 'https://example.com/pin.png', width: 30, height: 30 },
 * ] }
 * ```
 *
 * @example — vector marker (filled triangle)
 * ```ts
 * { type: 'multilayer-point', symbolLayers: [
 *   { type: 'vector-marker', size: 24,
 *     geometry: { type: 'polygon', points: [
 *       { x: 0, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
 *     ] },
 *     fillColor: '#e63946', outlineColor: '#1d3557', outlineWidth: 1.5 },
 * ] }
 * ```
 */
export type MultilayerPointSymbolType = {
  type: 'multilayer-point';
  /** The symbol layers to compose, rendered in list order. */
  symbolLayers: SymbolLayerSpec[];
};

/** Any symbol usable by a `<Graphic>`. Mirrors the native `Symbol` hierarchy. */
export type Symbol =
  | SimpleMarkerSymbol
  | SimpleLineSymbol
  | SimpleFillSymbol
  | TextSymbol
  | SimpleMarkerSceneSymbol
  | PictureMarkerSymbol
  | PictureFillSymbol
  | DistanceCompositeSceneSymbol
  | CompositeSymbolType
  | MultilayerPointSymbolType;

// ─── Visual Variables ────────────────────────────────────────────────────────

/** One stop in a `SizeVisualVariable` stops array. */
export type SizeStop = { value: number; size: number };

/** One stop in a `ColorVisualVariable` stops array. Color is a `#RRGGBB` / `#RRGGBBAA` hex string. */
export type ColorStop = { value: number; color: string };

/** One stop in an `OpacityVisualVariable` stops array. */
export type OpacityStop = { value: number; opacity: number };

/**
 * Data-driven marker size: feature attribute values in [`minDataValue`, `maxDataValue`] are
 * mapped linearly to symbol sizes in [`minSize`, `maxSize`] (device-independent pixels).
 * Alternatively, supply `stops` for arbitrary breakpoints.
 * Exactly one of `field` or `valueExpression` (Arcade) must be provided.
 */
export type SizeVisualVariable = {
  type: 'size';
  field?: string;
  valueExpression?: string;
  minDataValue?: number;
  maxDataValue?: number;
  minSize?: number;
  maxSize?: number;
  stops?: SizeStop[];
};

/**
 * Data-driven color: each stop maps a feature attribute value to a `#RRGGBB`/`#RRGGBBAA` color.
 * Exactly one of `field` or `valueExpression` (Arcade) must be provided.
 */
export type ColorVisualVariable = {
  type: 'color';
  field?: string;
  valueExpression?: string;
  stops: ColorStop[];
};

/**
 * Data-driven rotation: the feature attribute value (degrees) rotates the symbol.
 * `rotationType`: `'geographic'` (0 = north, clockwise) or `'arithmetic'` (0 = east, counter-clockwise).
 * Exactly one of `field` or `valueExpression` (Arcade) must be provided.
 */
export type RotationVisualVariable = {
  type: 'rotation';
  field?: string;
  valueExpression?: string;
  rotationType?: 'geographic' | 'arithmetic';
};

/**
 * Data-driven opacity: each stop maps a feature attribute value to an opacity in [0, 1].
 * Exactly one of `field` or `valueExpression` (Arcade) must be provided.
 */
export type OpacityVisualVariable = {
  type: 'opacity';
  field?: string;
  valueExpression?: string;
  stops: OpacityStop[];
};

/** Union of all supported visual variable types for data-driven symbology. */
export type VisualVariable =
  | SizeVisualVariable
  | ColorVisualVariable
  | RotationVisualVariable
  | OpacityVisualVariable;

// ─── Renderers ───────────────────────────────────────────────────────────────

/** A renderer that draws every feature/graphic with the same `symbol`. */
export type SimpleRenderer = {
  type: 'simple';
  symbol: Symbol;
  /** Optional data-driven size, color, rotation, or opacity overrides. */
  visualVariables?: VisualVariable[];
};

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
  /** Optional data-driven size, color, rotation, or opacity overrides. */
  visualVariables?: VisualVariable[];
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
  /** Optional data-driven size, color, rotation, or opacity overrides. */
  visualVariables?: VisualVariable[];
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
  /**
   * Language for basemap place-name labels. Only applies when `basemap` is a built-in style string.
   * Special values: `"global"` — English worldwide; `"local"` — local place names;
   * `"default"` — SDK default; `"applicationLocale"` — device locale.
   * Any other value is treated as a BCP-47 language tag (e.g. `"fr"`, `"ar"`, `"zh-Hans"`).
   */
  basemapLanguage?: string;
  /**
   * Worldview code for disputed-boundary rendering. Only applies when `basemap` is a built-in style.
   * Known codes: `"CN"`, `"IN"`, `"IL"`, `"JP"`, `"MA"`, `"PK"`, `"KR"`, `"AE"`, `"US"`, `"VN"`.
   */
  basemapWorldview?: string;
  /** Center + scale applied when the scene first loads. */
  initialViewpoint?: Viewpoint;
  /** 3D camera for the initial view (preferred over `initialViewpoint` for scenes). */
  camera?: Camera;
  /** Ground elevation surface (terrain). */
  surface?: Surface;
  /** Load the scene from an ArcGIS web scene. Construction-only (set once; remount to change). */
  portalItem?: PortalItem;
  /** Local path to a mobile scene package (`.mspk`); its first scene is shown when loaded. */
  mobileScenePackagePath?: string;
  /**
   * Named saved viewpoints stored on the scene. Replaces the scene's bookmark list each time the
   * prop changes. Each entry creates a native `Bookmark(name, Viewpoint(latitude, longitude, scale))`.
   * Navigation to a bookmark is done separately via the `<SceneView camera>` prop.
   */
  bookmarks?: { name: string; viewpoint: { latitude: number; longitude: number; scale: number } }[];
};

/** Sun lighting mode for a 3D scene view (controls shadows). */
export type SunLighting = 'off' | 'light' | 'lightAndShadows';

/** Atmosphere rendering for a 3D scene view. */
export type AtmosphereEffect = 'off' | 'horizonOnly' | 'realistic';

/**
 * Camera controller for a `<SceneView>`.
 * - `orbitLocation` — orbits around a fixed target point (`OrbitLocationCameraController`).
 * - `globe` — free globe navigation (`GlobeCameraController`).
 */
export type CameraController =
  | {
      type: 'orbitLocation';
      /** The point the camera orbits around (WGS84 longitude/latitude, optional altitude). */
      target: Point;
      /** Initial camera distance from the target, in meters. */
      distance: number;
    }
  | {
      /** Orbit a moving `<Graphic>` — also pass that graphic's ref via `<SceneView orbitGraphic>`. */
      type: 'orbitGeoElement';
      /** Initial camera distance from the target graphic, in meters. */
      distance: number;
    }
  | { type: 'globe' };

/** Props for the `<SceneView>` host component. */
export type SceneViewProps = {
  style?: StyleProp<ViewStyle>;
  /** Animates the view to this 3D camera whenever the value changes (runtime camera control). */
  camera?: Camera;
  /**
   * Swaps the scene's camera-control mode. Omit (or pass `null`) to use the SDK default.
   * - `{ type: 'orbitLocation', target, distance }` — orbit around a fixed point.
   * - `{ type: 'globe' }` — free globe navigation.
   */
  cameraController?: CameraController | null;
  /** Coordinate-grid overlay (MGRS / UTM / USNG / latitude-longitude). `null` / omitted = none. */
  grid?: GridConfig | null;
  /**
   * The graphic to orbit when `cameraController` is `{ type: 'orbitGeoElement' }` — the camera
   * follows this `<Graphic>` as it moves. Pass the ref obtained from `<Graphic ref>`.
   */
  orbitGraphic?: GraphicRef | null;
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
