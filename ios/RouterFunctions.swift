import ArcGIS
import Foundation

/// Free functions backing the JS `router` namespace — routing between stops via a `RouteTask`.
/// Registered as an `AsyncFunction` in `ExpoArcgisGeometryModule`.

private let worldRouteURL =
  "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World"

/// Caches one `RouteTask` per service URL so repeated solves don't reload the service metadata.
private final class RouteTaskCache: @unchecked Sendable {
  static let shared = RouteTaskCache()
  private let lock = NSLock()
  private var tasks: [String: RouteTask] = [:]

  func task(for url: String) -> RouteTask? {
    lock.lock()
    defer { lock.unlock() }
    if let task = tasks[url] { return task }
    guard let parsed = URL(string: url) else { return nil }
    let task = RouteTask(url: parsed)
    tasks[url] = task
    return task
  }
}

func solveRoute(_ stops: [[String: Any]], _ params: [String: Any]) async throws -> [String: Any] {
  guard let task = RouteTaskCache.shared.task(for: routeServiceURL(params)) else {
    return ["routes": [], "messages": []]
  }
  // makeDefaultParameters() loads the task, so `task.info` is populated afterwards.
  let parameters = try await task.makeDefaultParameters()
  applyRouteParameters(parameters, params, task: task)
  parameters.setStops(buildStops(stops))
  let result = try await task.solveRoute(using: parameters)
  return serializeRouteResult(result)
}

private func routeServiceURL(_ params: [String: Any]) -> String {
  params["routeServiceUrl"] as? String ?? worldRouteURL
}

private func buildStops(_ stops: [[String: Any]]) -> [Stop] {
  stops.compactMap { dict in
    guard let pointDict = dict["point"] as? [String: Any],
      let point = geometryFromDict(pointDict) as? Point
    else { return nil }
    let stop = Stop(point: point)
    if let name = dict["name"] as? String { stop.name = name }
    if let approach = curbApproach(dict["curbApproach"] as? String) { stop.curbApproach = approach }
    return stop
  }
}

/// Builds point barriers (locations the route must avoid) from JS point geometries.
private func buildPointBarriers(_ barriers: [[String: Any]]) -> [PointBarrier] {
  barriers.compactMap { (geometryFromDict($0) as? Point).map(PointBarrier.init(point:)) }
}

/// Maps the JS curb-approach union to the native `CurbApproach`.
private func curbApproach(_ s: String?) -> CurbApproach? {
  switch s {
  case "eitherSide": return .eitherSide
  case "leftSide": return .leftSide
  case "rightSide": return .rightSide
  case "noUTurn": return .noUTurn
  default: return nil
  }
}

private func applyRouteParameters(_ parameters: RouteParameters, _ params: [String: Any], task: RouteTask) {
  parameters.returnsDirections = params["returnDirections"] as? Bool ?? true
  if let directionsLanguage = params["directionsLanguage"] as? String { parameters.directionsLanguage = directionsLanguage }
  if let returnRoutes = params["returnRoutes"] as? Bool { parameters.returnsRoutes = returnRoutes }
  if let returnStops = params["returnStops"] as? Bool { parameters.returnsStops = returnStops }
  if let findBestSequence = params["findBestSequence"] as? Bool { parameters.findsBestSequence = findBestSequence }
  if let barriers = params["barriers"] as? [[String: Any]] { parameters.setPointBarriers(buildPointBarriers(barriers)) }
  if let travelModeName = params["travelMode"] as? String,
    let mode = task.info.travelModes.first(where: { $0.name == travelModeName }) {
    parameters.travelMode = mode
  }
}

private func serializeRouteResult(_ result: RouteResult) -> [String: Any] {
  [
    "routes": result.routes.map(serializeRoute),
    "messages": result.messages,
  ]
}

private func serializeRoute(_ route: Route) -> [String: Any] {
  [
    "geometry": route.geometry.map(dictFromGeometry) ?? NSNull(),
    "name": route.name,
    "totalLength": route.totalLength.converted(to: .meters).value,
    "travelTime": route.travelTime,
    "totalTime": route.totalTime,
    "directions": route.directionManeuvers.map(serializeManeuver),
  ]
}

private func serializeManeuver(_ maneuver: DirectionManeuver) -> [String: Any] {
  [
    "text": maneuver.text,
    "length": maneuver.length.converted(to: .meters).value,
    "duration": maneuver.duration,
    "geometry": maneuver.geometry.map(dictFromGeometry) ?? NSNull(),
  ]
}
