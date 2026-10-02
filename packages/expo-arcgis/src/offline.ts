import Module from './ExpoArcgisGeometryModule';
import ExtrasModule from './ExpoArcgisExtrasModule';
import type { JobRef } from './ExpoArcgisModule';
import type {
  GeodatabaseHandle,
  Geometry,
  OfflineGeodatabaseResult,
  OfflineMapParameterOverrides,
  OfflineMapResult,
  OfflineTileResult,
  PreplannedMapAreaInfo,
  TileCacheSizeEstimate,
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
   * downloading a mobile map package into a directory named `downloadName`. Returns a `JobRef`:
   * `await job.result()` to run it, `job.addListener('onProgress', …)` for progress, `job.cancel()`.
   *
   * Pass optional `overrides` to narrow the tile-cache scale range and reduce download size:
   * ```ts
   * offline.generateOfflineMap(id, area, 'myMap', { minScale: 0, maxScale: 5000 })
   * ```
   * See `OfflineMapParameterOverrides` for details on how minScale/maxScale are applied.
   */
  generateOfflineMap: (
    portalItemId: string,
    areaOfInterest: Geometry,
    downloadName: string,
    overrides?: OfflineMapParameterOverrides
  ): Promise<JobRef<OfflineMapResult>> =>
    Module.generateOfflineMap(portalItemId, areaOfInterest, downloadName, overrides ?? null),

  /**
   * Syncs a downloaded offline map (`.mmpk` at `mobileMapPackagePath`) with its services — pushes
   * local edits up and pulls server updates down. Returns a `JobRef` (`await job.result()`).
   */
  syncOfflineMap: (mobileMapPackagePath: string): Promise<JobRef<{ synced: boolean }>> =>
    Module.syncOfflineMap(mobileMapPackagePath),

  /** Lists the preplanned offline map areas published with the web map `portalItemId`. */
  preplannedMapAreas: (portalItemId: string): Promise<PreplannedMapAreaInfo[]> =>
    Module.preplannedMapAreas(portalItemId),

  /**
   * Downloads a preplanned offline map area (by `areaIndex`) into a directory named `downloadName`.
   * Returns a `JobRef` — `await job.result()`, observe `onProgress`, or `job.cancel()`.
   */
  downloadPreplannedOfflineMap: (
    portalItemId: string,
    areaIndex: number,
    downloadName: string
  ): Promise<JobRef<OfflineMapResult>> =>
    Module.downloadPreplannedOfflineMap(portalItemId, areaIndex, downloadName),

  /**
   * Generates a `.geodatabase` from a sync-enabled feature service for `extent`, downloading it as
   * `downloadName`. The returned `path` can be synced back later with `syncGeodatabase`.
   */
  generateGeodatabase: (
    featureServiceUrl: string,
    extent: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineGeodatabaseResult>> =>
    Module.generateGeodatabase(featureServiceUrl, extent, downloadName),

  /** Bidirectionally syncs a downloaded geodatabase with its feature service. */
  syncGeodatabase: (
    geodatabasePath: string,
    featureServiceUrl: string
  ): Promise<JobRef<{ synced: boolean }>> =>
    Module.syncGeodatabase(geodatabasePath, featureServiceUrl),

  /** Exports a raster tile cache (`.tpkx`) from a tile service for `areaOfInterest`. */
  exportTileCache: (
    tileServiceUrl: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineTileResult>> =>
    Module.exportTileCache(tileServiceUrl, areaOfInterest, downloadName),

  /** Exports a vector tile package (`.vtpk`) from a vector tile service for `areaOfInterest`. */
  exportVectorTiles: (
    vectorTileServiceUrl: string,
    areaOfInterest: Geometry,
    downloadName: string
  ): Promise<JobRef<OfflineTileResult>> =>
    Module.exportVectorTiles(vectorTileServiceUrl, areaOfInterest, downloadName),

  /**
   * Estimates the on-disk file size and tile count for an `exportTileCache` download WITHOUT
   * downloading. Useful for showing the user a preview before committing to a potentially large
   * download. Returns `{ fileSizeBytes: number, tileCount: number }`.
   *
   * Pass optional `minScale`/`maxScale` to match the scale window you plan to use in
   * `exportTileCache` — the SDK applies the same scale filtering so the estimate stays accurate.
   */
  estimateTileCacheSize: (params: {
    serviceUrl: string;
    area: Geometry;
    minScale?: number;
    maxScale?: number;
  }): Promise<TileCacheSizeEstimate> =>
    Module.estimateTileCacheSize(
      params.serviceUrl,
      params.area,
      params.minScale ?? null,
      params.maxScale ?? null
    ),

  /**
   * Opens a local mobile geodatabase (`.geodatabase` file, e.g. from `generateGeodatabase`) for
   * transactional editing — wrap edits in `beginTransaction` then `commitTransaction` or
   * `rollbackTransaction`.
   */
  openGeodatabase: (path: string): Promise<GeodatabaseHandle> => ExtrasModule.openGeodatabase(path),
};
