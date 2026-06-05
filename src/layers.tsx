import type {
  IntegratedMeshLayerProps,
  Ogc3DTilesLayerProps,
  OpenStreetMapLayerProps,
  PointCloudLayerProps,
  VectorTileLayerProps,
  WebTiledLayerProps,
  WmsLayerProps,
  WmtsLayerProps,
} from './ExpoArcgis.types';
import ExpoArcgisModule from './ExpoArcgisModule';
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
