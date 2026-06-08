import ArcGIS
import Foundation

/// Free functions backing the JS `geoprocessor` namespace — runs a geoprocessing service via a
/// `GeoprocessingTask`. Registered as an `AsyncFunction` in `ExpoArcgisGeometryModule`.

/// Caches one `GeoprocessingTask` per service URL so repeated runs don't reload service metadata.
private final class GeoprocessingTaskCache: @unchecked Sendable {
  static let shared = GeoprocessingTaskCache()
  private let lock = NSLock()
  private var tasks: [String: GeoprocessingTask] = [:]

  func task(for url: String) -> GeoprocessingTask? {
    lock.lock()
    defer { lock.unlock() }
    if let task = tasks[url] { return task }
    guard let parsed = URL(string: url) else { return nil }
    let task = GeoprocessingTask(url: parsed)
    tasks[url] = task
    return task
  }
}

func executeGeoprocessing(_ serviceUrl: String, _ inputs: [String: Any]) async throws -> [String: Any] {
  guard let task = GeoprocessingTaskCache.shared.task(for: serviceUrl) else { return ["outputs": [:]] }
  // makeDefaultParameters() loads the task and sets the service's execution type (sync / async).
  let parameters = try await task.makeDefaultParameters()
  for (name, raw) in inputs {
    if let dict = raw as? [String: Any], let param = buildGeoprocessingParameter(dict) {
      parameters.setInputValue(param, forKey: name)
    }
  }
  let job = task.makeJob(parameters: parameters)
  job.start()
  let result = try await job.result.get()
  return ["outputs": try await serializeOutputs(result.outputs)]
}

private func buildGeoprocessingParameter(_ d: [String: Any]) -> GeoprocessingParameter? {
  switch d["type"] as? String {
  case "string":
    return GeoprocessingString(value: d["value"] as? String ?? "")
  case "double":
    return GeoprocessingDouble(value: (d["value"] as? NSNumber)?.doubleValue ?? 0)
  case "long":
    return GeoprocessingLong(value: (d["value"] as? NSNumber)?.int32Value ?? 0)
  case "boolean":
    return GeoprocessingBoolean(value: d["value"] as? Bool ?? false)
  case "linearUnit":
    return GeoprocessingLinearUnit(
      distance: (d["value"] as? NSNumber)?.doubleValue ?? 0,
      linearUnit: linearUnit(d["unit"] as? String)
    )
  case "features":
    let geometries = (d["geometries"] as? [[String: Any]] ?? []).compactMap(geometryFromDict)
    let table = FeatureCollectionTable(geoElements: geometries.map { Graphic(geometry: $0) }, fields: [])
    return GeoprocessingFeatures(features: table)
  default:
    return nil
  }
}

private func serializeOutputs(_ outputs: [String: GeoprocessingParameter]) async throws -> [String: Any] {
  var result: [String: Any] = [:]
  for (name, param) in outputs {
    result[name] = try await serializeGeoprocessingParameter(param)
  }
  return result
}

private func serializeGeoprocessingParameter(_ param: GeoprocessingParameter) async throws -> Any {
  switch param {
  case let p as GeoprocessingString: return p.value
  case let p as GeoprocessingDouble: return p.value
  case let p as GeoprocessingLong: return Int(p.value)
  case let p as GeoprocessingBoolean: return p.value
  case let p as GeoprocessingLinearUnit: return p.distance
  case let p as GeoprocessingFeatures:
    if p.canFetchOutputFeatures { try await p.fetchOutputFeatures() }
    return p.features?.features().map(serializeFeature) ?? []
  default:
    return NSNull()
  }
}
