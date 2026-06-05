import { NativeModule, requireNativeModule } from 'expo';
import { SharedObject } from 'expo-modules-core';

import type {
  FeatureLayerProps,
  GeodeticDistanceResult,
  Geometry,
  GraphicProps,
  IntegratedMeshLayerProps,
  KmlLayerProps,
  MapImageLayerProps,
  MapProps,
  Ogc3DTilesLayerProps,
  PointCloudLayerProps,
  ProximityResult,
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

  // GeometryEngine — backing functions for the `geometryEngine` namespace (see ./geometryEngine).
  geProject(g: Geometry, wkid: number): Geometry | null;
  geBuffer(g: Geometry, distance: number): Geometry | null;
  geGeodeticBuffer(
    g: Geometry,
    distance: number,
    unit: string | null,
    maxDeviation: number | null,
    curve: string | null
  ): Geometry | null;
  geArea(g: Geometry): number;
  geGeodeticArea(g: Geometry, unit: string | null, curve: string | null): number;
  geLength(g: Geometry): number;
  geGeodeticLength(g: Geometry, unit: string | null, curve: string | null): number;
  geDistance(a: Geometry, b: Geometry): number | null;
  geGeodeticDistance(
    a: Geometry,
    b: Geometry,
    unit: string | null,
    curve: string | null
  ): GeodeticDistanceResult | null;
  geUnion(geometries: Geometry[]): Geometry | null;
  geIntersection(a: Geometry, b: Geometry): Geometry | null;
  geDifference(a: Geometry, b: Geometry): Geometry | null;
  geSymmetricDifference(a: Geometry, b: Geometry): Geometry | null;
  geClip(g: Geometry, envelope: Geometry): Geometry | null;
  geCut(g: Geometry, cutter: Geometry): Geometry[];
  geConvexHull(g: Geometry): Geometry | null;
  geBoundary(g: Geometry): Geometry | null;
  geSimplify(g: Geometry): Geometry | null;
  geDensify(g: Geometry, maxSegmentLength: number): Geometry | null;
  geGeneralize(g: Geometry, maxDeviation: number, removeDegenerate: boolean): Geometry | null;
  geOffset(
    g: Geometry,
    distance: number,
    type: string | null,
    bevelRatio: number,
    flattenError: number
  ): Geometry | null;
  geCombineExtents(a: Geometry, b: Geometry): Geometry | null;
  geContains(a: Geometry, b: Geometry): boolean;
  geCrosses(a: Geometry, b: Geometry): boolean;
  geDisjoint(a: Geometry, b: Geometry): boolean;
  geEquals(a: Geometry, b: Geometry): boolean;
  geIntersects(a: Geometry, b: Geometry): boolean;
  geOverlaps(a: Geometry, b: Geometry): boolean;
  geTouches(a: Geometry, b: Geometry): boolean;
  geWithin(a: Geometry, b: Geometry): boolean;
  geRelate(a: Geometry, b: Geometry, relation: string): boolean;
  geIsSimple(g: Geometry): boolean;
  geNearestCoordinate(g: Geometry, p: Geometry): ProximityResult | null;
  geNearestVertex(g: Geometry, p: Geometry): ProximityResult | null;
  geMove(g: Geometry, deltaX: number, deltaY: number): Geometry | null;
  geRotate(g: Geometry, angle: number, origin: Geometry | null): Geometry | null;
  geScale(g: Geometry, factorX: number, factorY: number, origin: Geometry | null): Geometry | null;
  // Constructable native handles (SharedObjects). JS names mirror the native classes.
  MapRef: new (props?: MapProps) => MapRef;
  SceneRef: new (props?: SceneProps) => SceneRef;
  FeatureLayerRef: new (props: FeatureLayerProps) => LayerRef;
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
}

export default requireNativeModule<ExpoArcgisModule>('ExpoArcgis');
