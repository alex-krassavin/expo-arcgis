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

func generateOfflineMap(_ portalItemId: String, _ areaOfInterest: [String: Any], _ downloadName: String) async throws -> [String: Any] {
  guard let area = geometryFromDict(areaOfInterest), let itemID = PortalItem.ID(portalItemId) else {
    return ["path": ""]
  }
  let portalItem = PortalItem(portal: .arcGISOnline(connection: .anonymous), id: itemID)
  let task = OfflineMapTask(portalItem: portalItem)
  let parameters = try await task.makeDefaultGenerateOfflineMapParameters(areaOfInterest: area)
  let directory = offlineDownloadURL(downloadName)
  let job = task.makeGenerateOfflineMapJob(parameters: parameters, downloadDirectory: directory)
  job.start()
  _ = try await job.result.get()
  return ["path": directory.path]
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

func downloadPreplannedOfflineMap(_ portalItemId: String, _ areaIndex: Int, _ downloadName: String) async throws -> [String: Any] {
  guard let task = offlineMapTask(portalItemId) else { return ["path": ""] }
  try await task.load()
  let areas = try await task.preplannedMapAreas
  guard areaIndex >= 0, areaIndex < areas.count else { return ["path": ""] }
  let parameters = try await task.makeDefaultDownloadPreplannedOfflineMapParameters(preplannedMapArea: areas[areaIndex])
  let directory = offlineDownloadURL(downloadName)
  let job = task.makeDownloadPreplannedOfflineMapJob(parameters: parameters, downloadDirectory: directory)
  job.start()
  _ = try await job.result.get()
  return ["path": directory.path]
}

func generateGeodatabase(_ featureServiceUrl: String, _ extent: [String: Any], _ downloadName: String) async throws -> [String: Any] {
  guard let url = URL(string: featureServiceUrl), let area = geometryFromDict(extent) else {
    return ["path": "", "tableCount": 0]
  }
  let task = GeodatabaseSyncTask(url: url)
  let parameters = try await task.makeDefaultGenerateGeodatabaseParameters(extent: area)
  let fileURL = offlineDownloadURL(downloadName + ".geodatabase")
  let job = task.makeGenerateGeodatabaseJob(parameters: parameters, downloadFileURL: fileURL)
  job.start()
  let geodatabase = try await job.result.get()
  return ["path": geodatabase.fileURL.path, "tableCount": geodatabase.featureTables.count]
}

func syncGeodatabase(_ geodatabasePath: String, _ featureServiceUrl: String) async throws -> [String: Any] {
  guard let url = URL(string: featureServiceUrl) else { return ["synced": false] }
  let geodatabase = Geodatabase(fileURL: URL(fileURLWithPath: geodatabasePath))
  try await geodatabase.load()
  let task = GeodatabaseSyncTask(url: url)
  let job = task.makeSyncGeodatabaseJob(syncDirection: .bidirectional, rollbackOnFailure: true, geodatabase: geodatabase)
  job.start()
  _ = try await job.result.get()
  return ["synced": true]
}

func exportTileCache(_ tileServiceUrl: String, _ areaOfInterest: [String: Any], _ downloadName: String) async throws -> [String: Any] {
  guard let url = URL(string: tileServiceUrl), let area = geometryFromDict(areaOfInterest) else {
    return ["path": ""]
  }
  let task = ExportTileCacheTask(url: url)
  let parameters = try await task.makeDefaultExportTileCacheParameters(areaOfInterest: area)
  let fileURL = offlineDownloadURL(downloadName + ".tpkx")
  let job = task.makeExportTileCacheJob(parameters: parameters, downloadFileURL: fileURL)
  job.start()
  _ = try await job.result.get()
  return ["path": fileURL.path]
}

func exportVectorTiles(_ vectorTileServiceUrl: String, _ areaOfInterest: [String: Any], _ downloadName: String) async throws -> [String: Any] {
  guard let url = URL(string: vectorTileServiceUrl), let area = geometryFromDict(areaOfInterest) else {
    return ["path": ""]
  }
  let task = ExportVectorTilesTask(url: url)
  let parameters = try await task.makeDefaultExportVectorTilesParameters(areaOfInterest: area)
  let fileURL = offlineDownloadURL(downloadName + ".vtpk")
  let job = task.makeExportVectorTilesJob(parameters: parameters, downloadFileURL: fileURL)
  job.start()
  _ = try await job.result.get()
  return ["path": fileURL.path]
}
