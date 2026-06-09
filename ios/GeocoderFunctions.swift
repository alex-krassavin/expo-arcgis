import ArcGIS
import Foundation

/// Free functions backing the JS `geocoder` namespace — forward / reverse geocoding via a
/// `LocatorTask`. Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.
///
/// SuggestResult round-trip
/// ─────────────────────────
/// `suggest(...)` attaches a `suggestionId` (Int) to each returned item and stashes the native
/// `SuggestResult` (and its locator URL) in `SuggestRegistry`. The registry is REPLACED on each
/// new `suggest` call (ids restart from 0) so memory never grows unboundedly.
/// `geocodeSuggestion(suggestionId, locatorUrl?)` looks up the held result and calls
/// `LocatorTask.geocode(forSuggestResult:)` — the SDK's precise overload that avoids a text
/// re-search.

/// Holds the native `SuggestResult`s from the most recent `suggest` call.
private final class SuggestRegistry: @unchecked Sendable {
  static let shared = SuggestRegistry()
  private let lock = NSLock()
  private var results: [Int: SuggestResult] = [:]
  private var locatorUrl: String = ""

  /// Replaces the registry with a fresh set of results (called at the start of each `suggest`).
  func reset(url: String, results: [(Int, SuggestResult)]) {
    lock.lock()
    defer { lock.unlock() }
    self.locatorUrl = url
    self.results = Dictionary(uniqueKeysWithValues: results)
  }

  func lookup(_ id: Int) -> (result: SuggestResult, locatorUrl: String)? {
    lock.lock()
    defer { lock.unlock() }
    guard let r = results[id] else { return nil }
    return (r, locatorUrl)
  }
}

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
  let geocodeParameters = buildGeocodeParameters(params)
  let results: [GeocodeResult]
  if let raw = params["searchValues"] as? [String: Any],
     !raw.isEmpty,
     let searchValues = raw as? [String: String] {
    results = try await locator.geocode(forSearchValues: searchValues, using: geocodeParameters)
  } else {
    results = try await locator.geocode(forSearchText: searchText, using: geocodeParameters)
  }
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
  if let names = params["resultAttributeNames"] as? [String] { parameters.addResultAttributeNames(names) }
  if let wkid = params["outputSpatialReference"] as? NSNumber,
     let sr = SpatialReference(wkid: WKID(wkid.intValue)!) {
    parameters.outputSpatialReference = sr
  }
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
  let url = locatorURL(params)
  guard let locator = LocatorCache.shared.task(for: url) else { return [] }
  let results = try await locator.suggest(forSearchText: searchText, parameters: buildSuggestParameters(params))
  // Assign a stable id to each result and stash in the registry (replaces any prior batch).
  let indexed = results.enumerated().map { (id: $0.offset, result: $0.element) }
  SuggestRegistry.shared.reset(url: url, results: indexed.map { ($0.id, $0.result) })
  return indexed.map { entry in
    var dict = serializeSuggestResult(entry.result)
    dict["suggestionId"] = entry.id
    return dict
  }
}

func geocodeSuggestion(_ suggestionId: Int, _ params: [String: Any]) async throws -> [[String: Any]] {
  // Allow the caller to override the locator URL, but fall back to the one stored by suggest().
  let overrideUrl = params["locatorUrl"] as? String
  guard let (suggestResult, storedUrl) = SuggestRegistry.shared.lookup(suggestionId) else {
    throw NSError(
      domain: "ExpoArcgis",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "suggestionId \(suggestionId) not found — call suggest() first"]
    )
  }
  let url = overrideUrl ?? storedUrl
  guard let locator = LocatorCache.shared.task(for: url) else { return [] }
  let results = try await locator.geocode(forSuggestResult: suggestResult)
  return results.map(serializeGeocodeResult)
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
