import { NativeModule, requireNativeModule } from 'expo';

import type { GroupLayerRef, JobRef, LayerRef } from './ExpoArcgisModule';
import type {
  AnnotationLayerProps,
  BuildingSceneLayerProps,
  DimensionLayerProps,
  FeatureCollectionLayerProps,
  GeoPackageLayerProps,
  LayerProps,
  OrientedImageryLayerProps,
  SubtypeFeatureLayerProps,
  GeocodeResult,
  GeodeticDistanceResult,
  Geometry,
  GeoprocessingInput,
  GeoprocessingResult,
  OfflineGeodatabaseResult,
  OfflineMapResult,
  OfflineTileResult,
  PreplannedMapAreaInfo,
  ProximityResult,
  RouteResult,
  RouteStop,
  SuggestResult,
} from './ExpoArcgis.types';

/**
 * Backing native module for the `geometryEngine` and `coordinateFormatter` namespaces. Kept
 * separate from the main `ExpoArcgis` module so neither native `definition()` grows past the
 * JVM 64 KB method-size limit on Android.
 */
declare class ExpoArcgisGeometryModule extends NativeModule {
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
  geLabelPoint(polygon: Geometry): Geometry | null;
  geNormalizeCentralMeridian(g: Geometry): Geometry | null;
  geReshape(g: Geometry, reshaper: Geometry): Geometry | null;
  geIntersections(a: Geometry, b: Geometry): Geometry[];
  geExtend(polyline: Geometry, extender: Geometry): Geometry | null;
  geAutoComplete(existingPolygons: Geometry[], boundaries: Geometry[]): Geometry[];
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

  // CoordinateFormatter — backing functions for the `coordinateFormatter` namespace.
  cfToLatLong(p: Geometry, format: string | null, decimalPlaces: number): string | null;
  cfFromLatLong(coordinates: string, wkid: number): Geometry | null;
  cfToMgrs(p: Geometry, mode: string | null, precision: number, addSpaces: boolean): string | null;
  cfFromMgrs(coordinates: string, wkid: number, mode: string | null): Geometry | null;
  cfToUsng(p: Geometry, precision: number, addSpaces: boolean): string | null;
  cfFromUsng(coordinates: string, wkid: number): Geometry | null;
  cfToUtm(p: Geometry, mode: string | null, addSpaces: boolean): string | null;
  cfFromUtm(coordinates: string, wkid: number, mode: string | null): Geometry | null;

  // Geocoding — backing functions for the `geocoder` namespace (see ./geocoder).
  geocode(searchText: string, params: Record<string, unknown>): Promise<GeocodeResult[]>;
  reverseGeocode(point: Geometry, params: Record<string, unknown>): Promise<GeocodeResult[]>;
  suggest(searchText: string, params: Record<string, unknown>): Promise<SuggestResult[]>;

  // Routing — backing function for the `router` namespace (see ./router).
  solveRoute(stops: RouteStop[], params: Record<string, unknown>): Promise<RouteResult>;

  // Geoprocessing — backing function for the `geoprocessor` namespace (see ./geoprocessor).
  executeGeoprocessing(
    serviceUrl: string,
    inputs: Record<string, GeoprocessingInput>
  ): Promise<JobRef<GeoprocessingResult>>;

  // Offline — backing functions for the `offline` namespace (see ./offline).
  generateOfflineMap(
    portalItemId: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineMapResult>>;
  syncOfflineMap(mobileMapPackagePath: string): Promise<JobRef<{ synced: boolean }>>;
  preplannedMapAreas(portalItemId: string): Promise<PreplannedMapAreaInfo[]>;
  downloadPreplannedOfflineMap(
    portalItemId: string,
    areaIndex: number,
    downloadName: string
  ): Promise<JobRef<OfflineMapResult>>;
  generateGeodatabase(
    featureServiceUrl: string,
    extent: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineGeodatabaseResult>>;
  syncGeodatabase(
    geodatabasePath: string,
    featureServiceUrl: string
  ): Promise<JobRef<{ synced: boolean }>>;
  exportTileCache(
    tileServiceUrl: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineTileResult>>;
  exportVectorTiles(
    vectorTileServiceUrl: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineTileResult>>;

  // Auth — persistent credential store.  Registered here (not on the main module) to keep both
  // native `definition()` methods under the Android JVM 64 KB limit.
  enablePersistentCredentialStore(): Promise<void>;
  clearCredentialStore(): Promise<void>;

  // Extended operational layers — registered here (not on the main module) to keep both native
  // `definition()` methods under the Android JVM 64 KB limit. SharedObjects cross modules freely.
  AnnotationLayerRef: new (props: AnnotationLayerProps) => LayerRef;
  DimensionLayerRef: new (props: DimensionLayerProps) => LayerRef;
  BuildingSceneLayerRef: new (props: BuildingSceneLayerProps) => LayerRef;
  OrientedImageryLayerRef: new (props: OrientedImageryLayerProps) => LayerRef;
  SubtypeFeatureLayerRef: new (props: SubtypeFeatureLayerProps) => LayerRef;
  GroupLayerRef: new (props: LayerProps) => GroupLayerRef;
  FeatureCollectionLayerRef: new (props: FeatureCollectionLayerProps) => LayerRef;
  GeoPackageLayerRef: new (props: GeoPackageLayerProps) => LayerRef;
}

export default requireNativeModule<ExpoArcgisGeometryModule>('ExpoArcgisGeometry');
