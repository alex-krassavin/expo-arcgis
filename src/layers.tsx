import type {
  AnnotationLayerProps,
  BuildingSceneLayerProps,
  DimensionLayerProps,
  GeoPackageLayerProps,
  IntegratedMeshLayerProps,
  KmlLayerProps,
  Ogc3DTilesLayerProps,
  OgcFeatureLayerProps,
  OpenStreetMapLayerProps,
  OrientedImageryLayerProps,
  PointCloudLayerProps,
  RasterLayerProps,
  SubtypeFeatureLayerProps,
  FeatureCollectionLayerProps,
  VectorTileLayerProps,
  WebTiledLayerProps,
  WfsLayerProps,
  WmsLayerProps,
  WmtsLayerProps,
} from './ExpoArcgis.types';
import ExpoArcgisModule from './ExpoArcgisModule';
import ExpoArcgisGeometryModule from './ExpoArcgisGeometryModule';
import { createLayerComponent } from './createLayerComponent';

/** Declarative `ArcGISVectorTiledLayer` (vector tile service / style). 2D (and 3D). */
export const VectorTileLayer = createLayerComponent<VectorTileLayerProps>(
  (props) => new ExpoArcgisModule.VectorTiledLayerRef(props)
);

/** Declarative `IntegratedMeshLayer` (3D integrated mesh from a scene service). */
export const IntegratedMeshLayer = createLayerComponent<IntegratedMeshLayerProps>(
  (props) => new ExpoArcgisModule.IntegratedMeshLayerRef(props)
);

/** Declarative `PointCloudLayer` (3D point cloud from a scene service). */
export const PointCloudLayer = createLayerComponent<PointCloudLayerProps>(
  (props) => new ExpoArcgisModule.PointCloudLayerRef(props)
);

/** Declarative OGC 3D Tiles layer (3D). */
export const Ogc3DTilesLayer = createLayerComponent<Ogc3DTilesLayerProps>(
  (props) => new ExpoArcgisModule.Ogc3DTilesLayerRef(props)
);

/** Declarative `WebTiledLayer` from a `{level}/{row}/{col}` tile URL template. */
export const WebTiledLayer = createLayerComponent<WebTiledLayerProps>(
  (props) => new ExpoArcgisModule.WebTiledLayerRef(props)
);

/** Declarative `OpenStreetMapLayer` (built-in OSM tiles as an operational layer). */
export const OpenStreetMapLayer = createLayerComponent<OpenStreetMapLayerProps>(
  () => new ExpoArcgisModule.OpenStreetMapLayerRef()
);

/** Declarative WMS layer (Web Map Service: URL + visible layer names). */
export const WmsLayer = createLayerComponent<WmsLayerProps>(
  (props) => new ExpoArcgisModule.WmsLayerRef(props)
);

/** Declarative WMTS layer (Web Map Tile Service: URL + layer id). */
export const WmtsLayer = createLayerComponent<WmtsLayerProps>(
  (props) => new ExpoArcgisModule.WmtsLayerRef(props)
);

/** Declarative `RasterLayer` from a remote image service or a local raster file. */
export const RasterLayer = createLayerComponent<RasterLayerProps>(
  (props) => new ExpoArcgisModule.RasterLayerRef(props)
);

/** Declarative `KmlLayer` from a remote `.kml`/`.kmz` URL or a local file. */
export const KmlLayer = createLayerComponent<KmlLayerProps>(
  (props) => new ExpoArcgisModule.KmlLayerRef(props)
);

/** Declarative WFS layer (Web Feature Service: URL + feature-type/table name). */
export const WfsLayer = createLayerComponent<WfsLayerProps>(
  (props) => new ExpoArcgisModule.WfsLayerRef(props)
);

/** Declarative OGC API - Features layer (landing-page URL + collection id). */
export const OgcFeatureLayer = createLayerComponent<OgcFeatureLayerProps>(
  (props) => new ExpoArcgisModule.OgcFeatureLayerRef(props)
);

// Annotation / dimension / building-scene / oriented-imagery / subtype layers are registered on the
// secondary native module (ExpoArcgisGeometry) to keep the main module under the JVM 64 KB limit.
/** Declarative annotation layer (map text as annotation features) from a feature service URL. */
export const AnnotationLayer = createLayerComponent<AnnotationLayerProps>(
  (props) => new ExpoArcgisGeometryModule.AnnotationLayerRef(props)
);

/** Declarative dimension layer (engineering/measurement dimensions) from a feature service URL. */
export const DimensionLayer = createLayerComponent<DimensionLayerProps>(
  (props) => new ExpoArcgisGeometryModule.DimensionLayerRef(props)
);

/** Declarative 3D building scene layer from a scene service URL. */
export const BuildingSceneLayer = createLayerComponent<BuildingSceneLayerProps>(
  (props) => new ExpoArcgisGeometryModule.BuildingSceneLayerRef(props)
);

/** Declarative oriented imagery layer (positioned/oriented photos) from a feature service URL. */
export const OrientedImageryLayer = createLayerComponent<OrientedImageryLayerProps>(
  (props) => new ExpoArcgisGeometryModule.OrientedImageryLayerRef(props)
);

/** Declarative subtype feature layer (one sublayer per subtype) from a feature service URL. */
export const SubtypeFeatureLayer = createLayerComponent<SubtypeFeatureLayerProps>(
  (props) => new ExpoArcgisGeometryModule.SubtypeFeatureLayerRef(props)
);

/** In-memory `FeatureCollectionLayer` — built from a client-side `fields` schema + `features`. */
export const FeatureCollectionLayer = createLayerComponent<FeatureCollectionLayerProps>(
  (props) => new ExpoArcgisGeometryModule.FeatureCollectionLayerRef(props)
);

/**
 * Declarative layer from a local GeoPackage (`.gpkg`) file. Opens the file asynchronously,
 * picks the feature table by `tableName` (or the first table when omitted), and displays it
 * once loaded. `path` and `tableName` are construction-only; remount to change.
 */
export const GeoPackageLayer = createLayerComponent<GeoPackageLayerProps>(
  (props) => new ExpoArcgisGeometryModule.GeoPackageLayerRef(props)
);
