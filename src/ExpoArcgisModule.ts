import { NativeModule, requireNativeModule } from 'expo';
import { SharedObject } from 'expo-modules-core';

import type {
  ConnectionStatus,
  DistanceMeasurementProps,
  DynamicEntityLayerProps,
  Feature,
  FeatureLayerProps,
  FeatureTemplate,
  Geometry,
  GraphicProps,
  LineOfSightProps,
  QueryParameters,
  StatisticRecord,
  StatisticsQueryParameters,
  IntegratedMeshLayerProps,
  KmlLayerProps,
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
  addFeature(attributes: Record<string, unknown>, geometry?: Geometry): Promise<number | null>;
  updateFeature(objectId: number, changes: Record<string, unknown>): Promise<void>;
  deleteFeature(objectId: number): Promise<void>;
}

/** Events emitted by a `DynamicEntityLayerRef` as its data source connects / disconnects. */
type DynamicEntityLayerEvents = {
  onConnectionStatusChange: (event: { status: ConnectionStatus }) => void;
};

/** Reference to a native real-time `DynamicEntityLayer` (stream service / custom feed). */
export declare class DynamicEntityLayerRef extends LayerRef<DynamicEntityLayerEvents> {
  queryDynamicEntities(): Promise<{
    count: number;
    entities: { attributes: Record<string, unknown>; geometry: Geometry | null }[];
  }>;
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

/** Events emitted by a `LineOfSightRef` as the target's visibility from the observer changes. */
type LineOfSightEvents = {
  onTargetVisibilityChange(payload: { visibility: TargetVisibility }): void;
};

/** Reference to a native exploratory line of sight (`ExploratoryLocationLineOfSight`). */
export declare class LineOfSightRef extends AnalysisRef<LineOfSightEvents> {}

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
   */
  setTokenCredential(username: string, password: string): void;
  /** Clears the stored login and all cached credentials (token + OAuth). */
  signOut(): Promise<void>;
  /** iOS-only OAuth sign-in: the SDK presents the auth browser, then caches the credential. */
  signInWithOAuth(portalUrl: string, clientId: string, redirectUrl: string): Promise<void>;
  /** Android OAuth step 1: starts the flow and returns the authorize URL to open in a browser. */
  oauthStart(portalUrl: string, clientId: string, redirectUrl: string): Promise<string>;
  /** Android OAuth step 2: completes the flow with the browser redirect URL. */
  oauthComplete(redirectUrl: string): Promise<void>;
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
  KmlLayerRef: new (props: KmlLayerProps) => LayerRef;
  WfsLayerRef: new (props: WfsLayerProps) => LayerRef;
  OgcFeatureLayerRef: new (props: OgcFeatureLayerProps) => LayerRef;
  DynamicEntityLayerRef: new (props: DynamicEntityLayerProps) => DynamicEntityLayerRef;
  GraphicsOverlayRef: new () => GraphicsOverlayRef;
  GraphicRef: new (props: GraphicProps) => GraphicRef;
  GeometryEditorRef: new () => GeometryEditorRef;
  AnalysisOverlayRef: new () => AnalysisOverlayRef;
  ViewshedRef: new (props: ViewshedProps) => ViewshedRef;
  LineOfSightRef: new (props: Pick<LineOfSightProps, 'observer' | 'target'>) => LineOfSightRef;
  DistanceMeasurementRef: new (
    props: Pick<DistanceMeasurementProps, 'startLocation' | 'endLocation'>
  ) => DistanceMeasurementRef;
  UtilityNetworkRef: new (props: { serviceGeodatabaseUrl: string }) => UtilityNetworkRef;
}

export default requireNativeModule<ExpoArcgisModule>('ExpoArcgis');
