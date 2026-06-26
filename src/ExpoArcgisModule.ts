import { NativeModule, requireNativeModule } from 'expo';
import { SharedObject } from 'expo-modules-core';

import type {
  AttachmentInfo,
  ConnectionStatus,
  ContingentValuesResult,
  DynamicEntityChange,
  DynamicEntityObservationInfo,
  DistanceMeasurementProps,
  DynamicEntityLayerProps,
  CreateVersionParams,
  EditResult,
  Envelope,
  ServiceVersionInfo,
  Feature,
  FeatureLayerProps,
  FeatureTemplate,
  GeoElementViewshedProps,
  Geometry,
  RelatedFeaturesResult,
  GraphicProps,
  LineOfSightProps,
  QueryParameters,
  StatisticRecord,
  StatisticsQueryParameters,
  IntegratedMeshLayerProps,
  KmlLayerProps,
  KmlNodeInfo,
  OgcFeatureLayerProps,
  WfsLayerProps,
  MapImageLayerProps,
  MapProps,
  Ogc3DTilesLayerProps,
  PointCloudLayerProps,
  RasterLayerProps,
  Renderer,
  SceneLayerProps,
  SceneProps,
  TargetVisibility,
  TileLayerProps,
  UtilityAssociationSummary,
  UtilityElementDescriptor,
  UtilityNamedTraceConfiguration,
  UtilityNetworkState,
  UtilityTerminalConfiguration,
  UtilityTraceResult,
  VectorTileLayerProps,
  ViewshedProps,
  WebTiledLayerProps,
  WmsLayerProps,
  WmtsLayerProps,
} from './ExpoArcgis.types';

/** Reference to a native operational layer (FeatureLayer / ArcGISTiledLayer), shared by reference. */
export declare class LayerRef<
  TEvents extends Record<string, (...args: any[]) => void> = Record<never, never>,
> extends SharedObject<TEvents> {
  applyProps(changed: Record<string, unknown>): void;
}

/** Reference to a native `GroupLayer` — a `LayerRef` that also hosts its own child layers. */
export declare class GroupLayerRef extends LayerRef {
  addLayer(layer: LayerRef<any>): void;
  removeLayer(layer: LayerRef<any>): void;
}

/** Reference to a native `KmlLayer` — a `LayerRef` plus `getNodes` and tour controls (mirrors `KmlLayerHandle`). */
export declare class KmlLayerRef extends LayerRef {
  getNodes(): Promise<KmlNodeInfo[]>;
  playTour(): void;
  pauseTour(): void;
  resetTour(): void;
}

/**
 * Reference to a native `FeatureLayer` — a `LayerRef` plus the async query methods (these match
 * `FeatureLayerHandle`, so the component just hands this ref over via `useImperativeHandle`).
 */
export declare class FeatureLayerRef extends LayerRef {
  queryFeatures(query?: QueryParameters): Promise<Feature[]>;
  queryFeatureCount(query?: QueryParameters): Promise<number>;
  queryExtent(query?: QueryParameters): Promise<Geometry | null>;
  queryStatistics(query: StatisticsQueryParameters): Promise<StatisticRecord[]>;
  queryFeatureTemplates(): Promise<FeatureTemplate[]>;
  addFeature(
    attributes: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  addFeatureWithTemplate(
    templateName: string,
    attributes?: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  addFeatureWithSubtype(
    subtypeName: string,
    attributes?: Record<string, unknown>,
    geometry?: Geometry,
    apply?: boolean
  ): Promise<number | null>;
  updateFeature(objectId: number, changes: Record<string, unknown>, apply?: boolean): Promise<void>;
  deleteFeature(objectId: number, apply?: boolean): Promise<void>;
  applyEdits(): Promise<EditResult[]>;
  undoLocalEdits(): Promise<void>;
  queryRelatedFeatures(objectId: number): Promise<RelatedFeaturesResult[]>;
  queryAttachments(objectId: number): Promise<AttachmentInfo[]>;
  addAttachment(objectId: number, name: string, contentType: string, dataBase64: string): Promise<void>;
  fetchAttachment(objectId: number, attachmentId: number): Promise<string>;
  deleteAttachment(objectId: number, attachmentId: number): Promise<void>;
  updateAttachment(objectId: number, attachmentId: number, name: string, contentType: string, dataBase64: string): Promise<void>;
  getServiceGeodatabase(): Promise<ServiceGeodatabaseRef>;
  /**
   * Returns the valid contingent values for `fieldName` on the feature with `objectId`.
   * The `fieldName` is the name of an attribute field whose valid values may be constrained by
   * contingent-value rules (e.g. a "species" field whose options depend on "habitat"). Requires
   * an ArcGIS feature table; rejects for shapefiles and WFS tables.
   */
  getContingentValues(objectId: number, fieldName: string): Promise<ContingentValuesResult>;
}

/**
 * Reference to a native `ServiceGeodatabase`'s branch-versioning surface. Built by
 * `FeatureLayerRef.getServiceGeodatabase()` (never constructed directly). Mirrors
 * `ServiceGeodatabaseHandle`.
 */
export declare class ServiceGeodatabaseRef extends SharedObject {
  fetchVersions(): Promise<ServiceVersionInfo[]>;
  createVersion(params: CreateVersionParams): Promise<ServiceVersionInfo>;
  switchVersion(name: string): Promise<void>;
  applyEdits(): Promise<EditResult[]>;
  undoLocalEdits(): Promise<void>;
  hasLocalEdits(): boolean;
  getVersionName(): string;
  getDefaultVersionName(): string;
  supportsBranchVersioning(): boolean;
  getFeatureLayer(layerId: number): FeatureLayerRef;
}

/**
 * Reference to a native local mobile `Geodatabase` with transactional editing. Built by
 * `offline.openGeodatabase(path)` (never constructed directly). Mirrors `GeodatabaseHandle`.
 */
export declare class GeodatabaseRef extends SharedObject {
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  isInTransaction(): boolean;
  getFeatureTableNames(): string[];
  queryFeatureCount(tableName: string, whereClause?: string): Promise<number>;
  addFeature(
    tableName: string,
    attributes: Record<string, unknown>,
    geometry?: Geometry
  ): Promise<void>;
  getFeatureLayer(tableName: string): FeatureLayerRef;
}

/** Events emitted by a `DynamicEntityLayerRef` as its data source connects / disconnects. */
type DynamicEntityLayerEvents = {
  onConnectionStatusChange: (event: { status: ConnectionStatus }) => void;
  onDynamicEntityChange: (event: DynamicEntityChange) => void;
};

/** Reference to a native real-time `DynamicEntityLayer` (stream service / custom feed). */
export declare class DynamicEntityLayerRef extends LayerRef<DynamicEntityLayerEvents> {
  queryDynamicEntities(): Promise<{
    count: number;
    entities: { attributes: Record<string, unknown>; geometry: Geometry | null }[];
  }>;
  queryObservations(entityId: string, max?: number): Promise<DynamicEntityObservationInfo[]>;
  pushObservation(attributes: Record<string, unknown>, geometry: Geometry): void;
}

/** Reference to a native `Graphic` drawn on a graphics overlay. */
export declare class GraphicRef extends SharedObject {
  applyProps(changed: Record<string, unknown>): void;
}

/** Reference to a native `GraphicsOverlay` owned by a `<MapView>` / `<SceneView>`. */
export declare class GraphicsOverlayRef extends SharedObject {
  addGraphic(graphic: GraphicRef): void;
  removeGraphic(graphic: GraphicRef): void;
  setRenderer(renderer: Renderer | null): void;
}

/** Reference to a native `ImageOverlay`. Built via the `<ImageOverlay>` component (extras module). */
export declare class ImageOverlayRef extends SharedObject {
  setFrame(imagePath: string, extent: Envelope, opacity?: number): void;
  setOpacity(opacity: number): void;
}

/** Events emitted by a `GeometryEditorRef` as the user sketches. */
type GeometryEditorEvents = {
  onGeometryChange(payload: { geometry?: Geometry }): void;
};

/** Reference to a native exploratory `Analysis` (viewshed / line-of-sight) drawn on an analysis overlay. */
export declare class AnalysisRef<
  TEvents extends Record<string, (...args: any[]) => void> = Record<never, never>,
> extends SharedObject<TEvents> {
  applyProps(changed: Record<string, unknown>): void;
}

/** Reference to a native exploratory viewshed (`ExploratoryLocationViewshed`). */
export declare class ViewshedRef extends AnalysisRef {}

/**
 * Reference to a native GeoElement-anchored viewshed (`ExploratoryGeoElementViewshed`).
 * The observer tracks the graphic's position as it moves, so the viewshed follows the graphic.
 */
export declare class GeoElementViewshedRef extends AnalysisRef {}

/** Events emitted by a `LineOfSightRef` or `GeoElementLineOfSightRef` as target visibility changes. */
type LineOfSightEvents = {
  onTargetVisibilityChange(payload: { visibility: TargetVisibility }): void;
};

/** Reference to a native exploratory line of sight (`ExploratoryLocationLineOfSight`). */
export declare class LineOfSightRef extends AnalysisRef<LineOfSightEvents> {}

/**
 * Reference to a native GeoElement-anchored line of sight (`ExploratoryGeoElementLineOfSight`).
 * Both the observer and target track their respective graphics as they move.
 */
export declare class GeoElementLineOfSightRef extends AnalysisRef<LineOfSightEvents> {}

/** Events emitted by a `DistanceMeasurementRef` as the measured distances change. */
type DistanceMeasurementEvents = {
  onMeasurementChange(payload: {
    directDistance: number;
    horizontalDistance: number;
    verticalDistance: number;
  }): void;
};

/** Reference to a native distance measurement (`ExploratoryLocationDistanceMeasurement`). */
export declare class DistanceMeasurementRef extends AnalysisRef<DistanceMeasurementEvents> {}

/** Reference to a native `AnalysisOverlay` owned by a `<SceneView>`. */
export declare class AnalysisOverlayRef extends SharedObject {
  addAnalysis(analysis: AnalysisRef<any>): void;
  removeAnalysis(analysis: AnalysisRef<any>): void;
  setVisible(visible: boolean): void;
}

/** Reference to a native interactive `GeometryEditor`, bound to a `<MapView>`. */
export declare class GeometryEditorRef extends SharedObject<GeometryEditorEvents> {
  start(type: string): void;
  setTool(name: string): void;
  stop(): Geometry | null;
  clearGeometry(): void;
  undo(): void;
  redo(): void;
  deleteSelectedElement(): void;
}

/**
 * Reference to a native `ArcGISMap`. The `<Map>` component constructs one, reconciles prop changes
 * via `applyProps`, and attaches operational layers via `addLayer` / `removeLayer`.
 */
export declare class MapRef extends SharedObject {
  applyProps(changed: Partial<MapProps>): void;
  addLayer(layer: LayerRef<any>): void;
  removeLayer(layer: LayerRef<any>): void;
}

/** Reference to a native `ArcGISScene` (3D). Same shape as `MapRef`. */
export declare class SceneRef extends SharedObject {
  applyProps(changed: Partial<SceneProps>): void;
  addLayer(layer: LayerRef<any>): void;
  removeLayer(layer: LayerRef<any>): void;
}

/**
 * Reference to a native `UtilityNetwork` loaded from a feature service. The `<UtilityNetwork>`
 * component builds one, loads it (attaching it to the map), and runs traces through it.
 */
export declare class UtilityNetworkRef extends SharedObject {
  /** Builds + loads the network, adds it to `map`, and resolves with the network name. */
  load(map: MapRef): Promise<string>;
  /** Returns metadata about the loaded network (its network-source names). */
  describeNetwork(): { networkSources: string[] };
  /** Runs a trace and returns the element results. */
  trace(
    traceType: string,
    startingLocations: UtilityElementDescriptor[]
  ): Promise<UtilityTraceResult>;
  /** Queries a starting feature, traces from it, and selects the result features on the map. */
  traceFromQuery(
    tableName: string,
    whereClause: string,
    traceType: string
  ): Promise<UtilityTraceResult>;
  /** Lists the network's named trace configurations. */
  queryNamedTraceConfigurations(): Promise<UtilityNamedTraceConfiguration[]>;
  /** Traces using a named configuration (by global id), from a queried starting feature. */
  traceWithConfiguration(
    configGlobalId: string,
    tableName: string,
    whereClause: string
  ): Promise<UtilityTraceResult>;
  /** Returns the associations of a queried feature. */
  associations(tableName: string, whereClause: string): Promise<UtilityAssociationSummary>;
  /** Returns the terminal configurations defined in the network (synchronous — reads from definition). */
  getTerminalConfigurations(): UtilityTerminalConfiguration[];
  /** Returns the network's topology state (dirty areas, errors, topology enabled). */
  getState(): Promise<UtilityNetworkState>;
  /** Validates the network topology over `extent`; returns a job to run / track / cancel. */
  validateNetworkTopology(extent: Geometry): JobRef<{ validated: boolean }>;
}

/** Events emitted by a `JobRef` as a long-running job progresses. */
type JobEvents = { onProgress(payload: { progress: number }): void };

/**
 * Handle for a long-running ArcGIS job (e.g. an offline-map download). Await `result()` to run it
 * to completion, observe `onProgress` (0–100) via `addListener`, or `cancel()` it.
 */
export declare class JobRef<R> extends SharedObject<JobEvents> {
  result(): Promise<R>;
  cancel(): Promise<void>;
}

/** The geo model that operational layers attach to — a `<Map>` or a `<Scene>`. */
export type GeoModelRef = MapRef | SceneRef;

declare class ExpoArcgisModule extends NativeModule {
  /** Sets the ArcGIS API key (access token) used to authenticate with ArcGIS services. */
  setApiKey(apiKey: string): void;
  /**
   * Stores a login used to authenticate token-secured services (e.g. a utility-network feature
   * service). The challenge handler mints a `TokenCredential` for the exact resource the SDK
   * challenges for — no service URL or up-front timing needed.
   * `tokenExpirationMinutes` sets the token lifetime; pass `null` to use the server's default.
   */
  setTokenCredential(username: string, password: string, tokenExpirationMinutes: number | null): void;
  /** Clears the stored login and all cached credentials (token + OAuth). */
  signOut(): Promise<void>;
  /** iOS-only OAuth sign-in: the SDK presents the auth browser, then caches the credential. */
  signInWithOAuth(portalUrl: string, clientId: string, redirectUrl: string): Promise<void>;
  /** Android OAuth step 1: starts the flow and returns the authorize URL to open in a browser. */
  oauthStart(portalUrl: string, clientId: string, redirectUrl: string): Promise<string>;
  /** Android OAuth step 2: completes the flow with the browser redirect URL. */
  oauthComplete(redirectUrl: string): Promise<void>;
  /** App authentication (client id + secret, no user login) — caches an app token credential. */
  setAppCredential(portalUrl: string, clientId: string, clientSecret: string): Promise<void>;
  // Constructable native handles (SharedObjects). JS names mirror the native classes.
  MapRef: new (props?: MapProps) => MapRef;
  SceneRef: new (props?: SceneProps) => SceneRef;
  FeatureLayerRef: new (props: FeatureLayerProps) => FeatureLayerRef;
  TiledLayerRef: new (props: TileLayerProps) => LayerRef;
  MapImageLayerRef: new (props: MapImageLayerProps) => LayerRef;
  SceneLayerRef: new (props: SceneLayerProps) => LayerRef;
  VectorTiledLayerRef: new (props: VectorTileLayerProps) => LayerRef;
  IntegratedMeshLayerRef: new (props: IntegratedMeshLayerProps) => LayerRef;
  PointCloudLayerRef: new (props: PointCloudLayerProps) => LayerRef;
  Ogc3DTilesLayerRef: new (props: Ogc3DTilesLayerProps) => LayerRef;
  WebTiledLayerRef: new (props: WebTiledLayerProps) => LayerRef;
  OpenStreetMapLayerRef: new () => LayerRef;
  WmsLayerRef: new (props: WmsLayerProps) => LayerRef;
  WmtsLayerRef: new (props: WmtsLayerProps) => LayerRef;
  RasterLayerRef: new (props: RasterLayerProps) => LayerRef;
  KmlLayerRef: new (props: KmlLayerProps) => KmlLayerRef;
  WfsLayerRef: new (props: WfsLayerProps) => LayerRef;
  OgcFeatureLayerRef: new (props: OgcFeatureLayerProps) => LayerRef;
  DynamicEntityLayerRef: new (props: DynamicEntityLayerProps) => DynamicEntityLayerRef;
  GraphicsOverlayRef: new () => GraphicsOverlayRef;
  GraphicRef: new (props: GraphicProps) => GraphicRef;
  GeometryEditorRef: new () => GeometryEditorRef;
  AnalysisOverlayRef: new () => AnalysisOverlayRef;
  ViewshedRef: new (props: ViewshedProps) => ViewshedRef;
  GeoElementViewshedRef: new (graphic: GraphicRef, props: GeoElementViewshedProps) => GeoElementViewshedRef;
  LineOfSightRef: new (props: Pick<LineOfSightProps, 'observer' | 'target'>) => LineOfSightRef;
  GeoElementLineOfSightRef: new (observer: GraphicRef, target: GraphicRef) => GeoElementLineOfSightRef;
  DistanceMeasurementRef: new (
    props: Pick<DistanceMeasurementProps, 'startLocation' | 'endLocation'>
  ) => DistanceMeasurementRef;
  // UtilityNetworkRef is constructed via the Extras module (main-module 64 KB budget).
}

export default requireNativeModule<ExpoArcgisModule>('ExpoArcgis');
