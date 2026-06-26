import ArcGIS
import ExpoModulesCore
import Foundation

/// Free functions backing the JS `serviceArea` namespace — computing reachable areas from
/// facilities via a `ServiceAreaTask`. Registered as an `AsyncFunction` in
/// `ExpoArcgisGeometryModule`.

/// Caches one `ServiceAreaTask` per service URL so repeated solves don't reload service metadata.
private final class ServiceAreaTaskCache: @unchecked Sendable {
  static let shared = ServiceAreaTaskCache()
  private let lock = NSLock()
  private var tasks: [String: ServiceAreaTask] = [:]

  func task(for url: String) -> ServiceAreaTask? {
    lock.lock()
    defer { lock.unlock() }
    if let task = tasks[url] { return task }
    guard let parsed = URL(string: url) else { return nil }
    let task = ServiceAreaTask(url: parsed)
    tasks[url] = task
    return task
  }
}

func serviceAreaSolve(_ params: [String: Any]) async throws -> [String: Any] {
  guard let serviceUrl = params["serviceUrl"] as? String,
    let task = ServiceAreaTaskCache.shared.task(for: serviceUrl)
  else {
    return ["polygons": []]
  }
  // makeDefaultParameters() loads the task so the service metadata is populated afterwards.
  let parameters = try await task.makeDefaultParameters()
  let facilitiesDicts = params["facilities"] as? [[String: Any]] ?? []
  parameters.setFacilities(buildFacilities(facilitiesDicts))
  if let cutoffs = params["cutoffs"] as? [Double] {
    parameters.removeAllDefaultImpedanceCutoffs()
    parameters.addDefaultImpedanceCutoffs(cutoffs)
  }
  let result = try await task.solveServiceArea(using: parameters)
  return serializeServiceAreaResult(result)
}

private func buildFacilities(_ dicts: [[String: Any]]) -> [ServiceAreaFacility] {
  dicts.compactMap { dict in
    guard let point = geometryFromDict(dict) as? Point else { return nil }
    return ServiceAreaFacility(point: point)
  }
}

private func serializeServiceAreaResult(_ result: ServiceAreaResult) -> [String: Any] {
  var polygons: [[String: Any]] = []
  for (index, _) in result.facilities.enumerated() {
    let facilityPolygons = result.resultPolygons(forFacilityAtIndex: index)
    for polygon in facilityPolygons {
      polygons.append(serializeServiceAreaPolygon(polygon))
    }
  }
  return ["polygons": polygons]
}

private func serializeServiceAreaPolygon(_ polygon: ServiceAreaPolygon) -> [String: Any] {
  [
    "geometry": dictFromGeometry(polygon.geometry),
    "fromCutoff": polygon.fromImpedanceCutoff,
    "toCutoff": polygon.toImpedanceCutoff,
  ]
}
