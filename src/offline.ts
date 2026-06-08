import Module from './ExpoArcgisGeometryModule';
import type {
  Geometry,
  OfflineMapResult,
  PreplannedMapAreaInfo,
} from './ExpoArcgis.types';

/**
 * Take maps and data offline, mirroring `ArcGIS.OfflineMapTask` and the related export/sync tasks.
 * Each call is an asynchronous job that downloads files to the app's storage; pass the returned
 * `path` to `<Map mobileMapPackagePath>` to display a downloaded offline map. Services must be
 * offline-enabled (sync / exportTiles capability).
 */
export const offline = {
  /**
   * Takes a web map (`portalItemId`) offline on-demand for `areaOfInterest` (an envelope/polygon),
   * downloading a mobile map package into a directory named `downloadName`.
   */
  generateOfflineMap: (
    portalItemId: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<OfflineMapResult> =>
    Module.generateOfflineMap(portalItemId, areaOfInterest, downloadName),

  /** Lists the preplanned offline map areas published with the web map `portalItemId`. */
  preplannedMapAreas: (portalItemId: string): Promise<PreplannedMapAreaInfo[]> =>
    Module.preplannedMapAreas(portalItemId),

  /** Downloads a preplanned offline map area (by `areaIndex`) into a directory named `downloadName`. */
  downloadPreplannedOfflineMap: (
    portalItemId: string,
    areaIndex: number,
    downloadName: string
  ): Promise<OfflineMapResult> =>
    Module.downloadPreplannedOfflineMap(portalItemId, areaIndex, downloadName),
};
