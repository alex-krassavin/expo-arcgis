import { NativeModule, requireNativeModule } from 'expo';
import { SharedObject } from 'expo-modules-core';

import type {
  Feature,
  FeatureLayerProps,
  Geometry,
  GraphicProps,
  StatisticRecord,
  IntegratedMeshLayerProps,
  KmlLayerProps,
  MapImageLayerProps,
  MapProps,
  Ogc3DTilesLayerProps,
  PointCloudLayerProps,
  RasterLayerProps,
  Renderer,
  SceneLayerProps,
  SceneProps,
  TileLayerProps,
  VectorTileLayerProps,
  WebTiledLayerProps,
  WmsLayerProps,
  WmtsLayerProps,
} from './ExpoArcgis.types';

/** Reference to a native operational layer (FeatureLayer / ArcGISTiledLayer), shared by reference. */
export declare class LayerRef extends SharedObject {
  applyProps(changed: Record<string, unknown>): void;
}

/** Reference to a native `FeatureLayer` — a `LayerRef` plus async query methods. */
export declare class FeatureLayerRef extends LayerRef {
  queryFeatures(query: Record<string, unknown>): Promise<Feature[]>;
  queryFeatureCount(query: Record<string, unknown>): Promise<number>;
  queryExtent(query: Record<string, unknown>): Promise<Geometry | null>;
  queryStatistics(query: Record<string, unknown>): Promise<StatisticRecord[]>;
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

/** Reference to a native interactive `GeometryEditor`, bound to a `<MapView>`. */
export declare class GeometryEditorRef extends SharedObject<GeometryEditorEvents> {
  start(type: string): void;
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
  addLayer(layer: LayerRef): void;
  removeLayer(layer: LayerRef): void;
}

/** Reference to a native `ArcGISScene` (3D). Same shape as `MapRef`. */
export declare class SceneRef extends SharedObject {
  applyProps(changed: Partial<SceneProps>): void;
  addLayer(layer: LayerRef): void;
  removeLayer(layer: LayerRef): void;
}

/** The geo model that operational layers attach to — a `<Map>` or a `<Scene>`. */
export type GeoModelRef = MapRef | SceneRef;

declare class ExpoArcgisModule extends NativeModule {
  /** Sets the ArcGIS API key (access token) used to authenticate with ArcGIS services. */
  setApiKey(apiKey: string): void;
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
  GraphicsOverlayRef: new () => GraphicsOverlayRef;
  GraphicRef: new (props: GraphicProps) => GraphicRef;
  GeometryEditorRef: new () => GeometryEditorRef;
}

export default requireNativeModule<ExpoArcgisModule>('ExpoArcgis');
