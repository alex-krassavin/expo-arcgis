import ArcGIS
import Foundation

/// Free functions backing the JS `geocoder` namespace — forward / reverse geocoding via a
/// `LocatorTask`. Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.

private let worldGeocoderURL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"

/// Caches one `LocatorTask` per service URL so repeated geocodes don't reload the service metadata.
private final class LocatorCache: @unchecked Sendable {
  static let shared = LocatorCache()
  private let lock = NSLock()
  private var tasks: [String: LocatorTask] = [:]

  func task(for locator: String) -> LocatorTask? {
    lock.lock()
    defer { lock.unlock() }
    if let task = tasks[locator] { return task }
    // A scheme'd URL (online geocode service); otherwise a local file path (an offline `.loc`).
    let parsed = URL(string: locator).flatMap { $0.scheme != nil ? $0 : nil } ?? URL(fileURLWithPath: locator)
    let task = LocatorTask(url: parsed)
    tasks[locator] = task
    return task
  }
}

func geocode(_ searchText: String, _ params: [String: Any]) async throws -> [[String: Any]] {
  guard let locator = LocatorCache.shared.task(for: locatorURL(params)) else { return [] }
  let results = try await locator.geocode(forSearchText: searchText, using: buildGeocodeParameters(params))
  return results.map(serializeGeocodeResult)
}

func reverseGeocode(_ point: [String: Any], _ params: [String: Any]) async throws -> [[String: Any]] {
  guard let locator = LocatorCache.shared.task(for: locatorURL(params)),
    let location = geometryFromDict(point) as? Point
  else { return [] }
  let results = try await locator.reverseGeocode(forLocation: location, parameters: buildReverseGeocodeParameters(params))
  return results.map(serializeGeocodeResult)
}

private func locatorURL(_ params: [String: Any]) -> String {
  params["locatorUrl"] as? String ?? worldGeocoderURL
}

private func buildGeocodeParameters(_ params: [String: Any]) -> GeocodeParameters {
  let parameters = GeocodeParameters()
  if let maxResults = params["maxResults"] as? NSNumber { parameters.maxResults = maxResults.intValue }
  if let countryCode = params["countryCode"] as? String { parameters.countryCode = countryCode }
  if let categories = params["categories"] as? [String] { parameters.addCategories(categories) }
  if let location = (params["preferredSearchLocation"] as? [String: Any]).flatMap(geometryFromDict) as? Point {
    parameters.preferredSearchLocation = location
  }
  return parameters
}

private func buildReverseGeocodeParameters(_ params: [String: Any]) -> ReverseGeocodeParameters {
  let parameters = ReverseGeocodeParameters()
  if let maxResults = params["maxResults"] as? NSNumber { parameters.maxResults = maxResults.intValue }
  if let maxDistance = params["maxDistance"] as? NSNumber { parameters.maxDistance = maxDistance.doubleValue }
  return parameters
}

func suggest(_ searchText: String, _ params: [String: Any]) async throws -> [[String: Any]] {
  guard let locator = LocatorCache.shared.task(for: locatorURL(params)) else { return [] }
  let results = try await locator.suggest(forSearchText: searchText, parameters: buildSuggestParameters(params))
  return results.map(serializeSuggestResult)
}

private func buildSuggestParameters(_ params: [String: Any]) -> SuggestParameters {
  let parameters = SuggestParameters()
  if let maxResults = params["maxResults"] as? NSNumber { parameters.maxResults = maxResults.intValue }
  if let categories = params["categories"] as? [String] { parameters.addCategories(categories) }
  if let location = (params["preferredSearchLocation"] as? [String: Any]).flatMap(geometryFromDict) as? Point {
    parameters.preferredSearchLocation = location
  }
  return parameters
}

func serializeSuggestResult(_ result: SuggestResult) -> [String: Any] {
  ["label": result.label, "isCollection": result.isCollection]
}

func serializeGeocodeResult(_ result: GeocodeResult) -> [String: Any] {
  [
    "label": result.label,
    "score": result.score,
    "attributes": serializeAttributes(result.attributes),
    "location": result.displayLocation.map(dictFromGeometry) ?? NSNull(),
  ]
}
