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
