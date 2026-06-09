import ArcGIS
import Foundation

/// Free functions backing the JS `offline` namespace — take maps and data offline via the various
/// download/export tasks. Each is an async job that writes files into the app's documents dir.
/// Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.

/// Returns a fresh (emptied) download location under the app's documents directory. The offline
/// tasks require the destination not to already exist.
func offlineDownloadURL(_ name: String) -> URL {
  let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
  let url = documents.appendingPathComponent(name)
  try? FileManager.default.removeItem(at: url)
  return url
}

enum OfflineError: Error { case invalidParameters }

/// Returns a `JobRef` for an on-demand offline-map download (drive it via `result()` + `onProgress`).
/// When `overrides` contains `minScale`/`maxScale`, the function builds a
/// `GenerateOfflineMapParameterOverrides` object, trims the `levelIDs` on every
/// `ExportTileCacheParameters` entry to the scale window, then passes the overrides object to the
/// job constructor.
///
/// **Vector-tile entries** (`ExportVectorTilesParameters`) are not filtered — `SDK 300.0` exposes
/// no per-entry scale setter on `ExportVectorTilesParameters` via the override map (deferred).
func generateOfflineMap(
  _ portalItemId: String,
  _ areaOfInterest: [String: Any],
  _ downloadName: String,
  _ overridesDict: [String: Any]?
) async throws -> JobRef {
  guard let area = geometryFromDict(areaOfInterest), let itemID = PortalItem.ID(portalItemId) else {
    throw OfflineError.invalidParameters
  }
  let portalItem = PortalItem(portal: .arcGISOnline(connection: .anonymous), id: itemID)
  let task = OfflineMapTask(portalItem: portalItem)
  let parameters = try await task.makeDefaultGenerateOfflineMapParameters(areaOfInterest: area)
  let directory = offlineDownloadURL(downloadName)

  // Build parameter overrides when the caller supplied an overrides dictionary.
  var paramOverrides: GenerateOfflineMapParameterOverrides?
  if let dict = overridesDict {
    let ovr = try await task.makeGenerateOfflineMapParameterOverrides(parameters: parameters)
    let minScale = dict["minScale"] as? Double ?? 0
    let maxScale = dict["maxScale"] as? Double ?? 0
    // Apply scale window to every ExportTileCacheParameters entry.
    for (key, tileCacheParams) in ovr.exportTileCacheParameters {
      applyScaleToTileCacheParams(tileCacheParams, minScale: minScale, maxScale: maxScale)
      ovr.setExportTileCacheParameterValue(tileCacheParams, forKey: key)
    }
    // Note: ExportVectorTilesParameters has no per-entry scale filter in SDK 300.0 — deferred.
    paramOverrides = ovr
  }

  let job = task.makeGenerateOfflineMapJob(
    parameters: parameters,
    downloadDirectory: directory,
    overrides: paramOverrides
  )
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["path": directory.path]
  }
}

/// Trims `ExportTileCacheParameters.levelIDs` to the subset within [minScale, maxScale].
///
/// Level IDs in ArcGIS tile caches are WMS/WMTS LOD indices (0 = world, N = street-level).
/// We approximate the level number for a given scale using the standard Web Mercator formula:
///   `level ≈ log2(591_657_550 / scale)` (valid for WKID 3857 / 102100 tile schemes).
///
/// For services that use a different LOD scheme (e.g. 1:1 000 000 at level 0) the cutoff
/// will be approximate. This is an accepted approximation — see DEFER note in the caller.
///
/// - `maxScale > 0`: drop level IDs strictly finer than `maxScaleLevel` (i.e. id > maxScaleLevel).
/// - `minScale > 0`: drop level IDs strictly coarser than `minScaleLevel` (i.e. id < minScaleLevel).
private func applyScaleToTileCacheParams(
  _ params: ExportTileCacheParameters,
  minScale: Double,
  maxScale: Double
) {
  let levels = params.levelIDs  // read-only; sorted ascending
  guard !levels.isEmpty, maxScale > 0 || minScale > 0 else { return }

  // Reference scale denominator for level 0 in the standard Web Mercator tile scheme.
  let level0Scale: Double = 591_657_550

  func scaleToLevel(_ scale: Double) -> Int {
    guard scale > 0 else { return Int.max }
    let lvl = log2(level0Scale / scale)
    return max(0, Int(lvl.rounded()))
  }

  let maxLevelForScale = maxScale > 0 ? scaleToLevel(maxScale) : Int.max
  let minLevelForScale = minScale > 0 ? scaleToLevel(minScale) : 0

  let filtered = levels.filter { id in id >= minLevelForScale && id <= maxLevelForScale }
  guard filtered != levels else { return }
  params.removeAllLevelIDs()
  params.addLevelIDs(filtered)
}

private func offlineMapTask(_ portalItemId: String) -> OfflineMapTask? {
  guard let itemID = PortalItem.ID(portalItemId) else { return nil }
  return OfflineMapTask(portalItem: PortalItem(portal: .arcGISOnline(connection: .anonymous), id: itemID))
}

func preplannedMapAreas(_ portalItemId: String) async throws -> [[String: Any]] {
  guard let task = offlineMapTask(portalItemId) else { return [] }
  try await task.load()
  var result: [[String: Any]] = []
  for (index, area) in try await task.preplannedMapAreas.enumerated() {
    try? await area.load()
    result.append(["title": area.portalItem.title, "index": index])
  }
  return result
}

func downloadPreplannedOfflineMap(_ portalItemId: String, _ areaIndex: Int, _ downloadName: String) async throws -> JobRef {
  guard let task = offlineMapTask(portalItemId) else { throw OfflineError.invalidParameters }
  try await task.load()
  let areas = try await task.preplannedMapAreas
  guard areaIndex >= 0, areaIndex < areas.count else { throw OfflineError.invalidParameters }
  let parameters = try await task.makeDefaultDownloadPreplannedOfflineMapParameters(preplannedMapArea: areas[areaIndex])
  let directory = offlineDownloadURL(downloadName)
  let job = task.makeDownloadPreplannedOfflineMapJob(parameters: parameters, downloadDirectory: directory)
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["path": directory.path]
  }
}

/// Returns a `JobRef` that syncs a downloaded offline map (`.mmpk` at `mobileMapPackagePath`) with
/// its services — pushes local edits up and pulls server updates down.
func syncOfflineMap(_ mobileMapPackagePath: String) async throws -> JobRef {
  let package = MobileMapPackage(fileURL: URL(fileURLWithPath: mobileMapPackagePath))
  try await package.load()
  guard let map = package.maps.first else { throw OfflineError.invalidParameters }
  let task = OfflineMapSyncTask(map: map)
  let parameters = try await task.makeDefaultOfflineMapSyncParameters()
  let job = task.makeSyncOfflineMapJob(parameters: parameters)
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["synced": true]
  }
}

func generateGeodatabase(_ featureServiceUrl: String, _ extent: [String: Any], _ downloadName: String) async throws -> JobRef {
  guard let url = URL(string: featureServiceUrl), let area = geometryFromDict(extent) else {
    throw OfflineError.invalidParameters
  }
  let task = GeodatabaseSyncTask(url: url)
  let parameters = try await task.makeDefaultGenerateGeodatabaseParameters(extent: area)
  let fileURL = offlineDownloadURL(downloadName + ".geodatabase")
  let job = task.makeGenerateGeodatabaseJob(parameters: parameters, downloadFileURL: fileURL)
  return JobRef(job: job) {
    let geodatabase = try await job.result.get()
    return ["path": geodatabase.fileURL.path, "tableCount": geodatabase.featureTables.count]
  }
}

func syncGeodatabase(_ geodatabasePath: String, _ featureServiceUrl: String) async throws -> JobRef {
  guard let url = URL(string: featureServiceUrl) else { throw OfflineError.invalidParameters }
  let geodatabase = Geodatabase(fileURL: URL(fileURLWithPath: geodatabasePath))
  try await geodatabase.load()
  let task = GeodatabaseSyncTask(url: url)
  let job = task.makeSyncGeodatabaseJob(syncDirection: .bidirectional, rollbackOnFailure: true, geodatabase: geodatabase)
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["synced": true]
  }
}

func exportTileCache(_ tileServiceUrl: String, _ areaOfInterest: [String: Any], _ downloadName: String) async throws -> JobRef {
  guard let url = URL(string: tileServiceUrl), let area = geometryFromDict(areaOfInterest) else {
    throw OfflineError.invalidParameters
  }
  let task = ExportTileCacheTask(url: url)
  let parameters = try await task.makeDefaultExportTileCacheParameters(areaOfInterest: area)
  let fileURL = offlineDownloadURL(downloadName + ".tpkx")
  let job = task.makeExportTileCacheJob(parameters: parameters, downloadFileURL: fileURL)
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["path": fileURL.path]
  }
}

/// Estimates the on-disk file size and tile count for an `exportTileCache` download WITHOUT
/// downloading. Runs the `EstimateTileCacheSizeJob` to completion and returns `{fileSize, tileCount}`.
func estimateTileCacheSize(_ tileServiceUrl: String, _ areaOfInterest: [String: Any], _ options: [String: Any]?) async throws -> [String: Any] {
  guard let url = URL(string: tileServiceUrl), let area = geometryFromDict(areaOfInterest) else {
    throw OfflineError.invalidParameters
  }
  let task = ExportTileCacheTask(url: url)
  let parameters = try await task.makeDefaultExportTileCacheParameters(areaOfInterest: area)
  let job = task.makeEstimateTileCacheSizeJob(parameters: parameters)
  job.start()
  let estimate = try await job.result.get()
  return ["fileSize": estimate.fileSize, "tileCount": estimate.tileCount]
}

func exportVectorTiles(_ vectorTileServiceUrl: String, _ areaOfInterest: [String: Any], _ downloadName: String) async throws -> JobRef {
  guard let url = URL(string: vectorTileServiceUrl), let area = geometryFromDict(areaOfInterest) else {
    throw OfflineError.invalidParameters
  }
  let task = ExportVectorTilesTask(url: url)
  let parameters = try await task.makeDefaultExportVectorTilesParameters(areaOfInterest: area)
  let fileURL = offlineDownloadURL(downloadName + ".vtpk")
  let job = task.makeExportVectorTilesJob(parameters: parameters, downloadFileURL: fileURL)
  return JobRef(job: job) {
    _ = try await job.result.get()
    return ["path": fileURL.path]
  }
}
