import ArcGIS
import ExpoModulesCore
import Foundation

/// SharedObject wrapping a native `UtilityNetwork` loaded from a feature service's service
/// geodatabase. Built + loaded by the `<UtilityNetwork>` component, which then runs traces.
public final class UtilityNetworkRef: SharedObject {
  private let serviceGeodatabaseUrl: String
  private var network: UtilityNetwork?
  private var serviceGeodatabase: ServiceGeodatabase?
  /// Operational feature layers created for the network's tables, keyed by table name (for selection).
  private var featureLayers: [String: FeatureLayer] = [:]
  /// Named trace configurations queried from the network, keyed by global id (for trace-by-config).
  private var namedConfigurations: [String: UtilityNamedTraceConfiguration] = [:]

  init(serviceGeodatabaseUrl: String) {
    self.serviceGeodatabaseUrl = serviceGeodatabaseUrl
    super.init()
  }

  /// Builds the network from the service geodatabase, loads it, adds it (and its feature layers)
  /// to the map, and returns the network name.
  func load(_ mapRef: MapRef) async throws -> String {
    guard let url = URL(string: serviceGeodatabaseUrl) else { return "" }
    let serviceGeodatabase = ServiceGeodatabase(url: url)
    try await serviceGeodatabase.load()
    let network = UtilityNetwork(serviceGeodatabase: serviceGeodatabase)
    try await network.load()
    self.network = network
    self.serviceGeodatabase = serviceGeodatabase
    mapRef.map.addUtilityNetwork(network)
    // Display the network's feature layers so its devices / lines are visible and selectable.
    for table in serviceGeodatabase.connectedTables {
      let layer = FeatureLayer(featureTable: table)
      featureLayers[table.tableName] = layer
      mapRef.map.addOperationalLayer(layer)
    }
    return network.name
  }

  /// Returns metadata about the loaded network — the names of its network sources.
  func describeNetwork() -> [String: Any] {
    guard let definition = network?.definition else { return ["networkSources": []] }
    return ["networkSources": definition.networkSources.map { $0.name }]
  }

  /// Runs a trace from explicit asset-type descriptors (no map feature needed).
  func trace(_ traceTypeName: String, _ startingLocations: [[String: Any]]) async throws -> [String: Any] {
    guard let network else { return emptyTraceResult }
    let elements = startingLocations.compactMap { makeUtilityElement(network, $0) }
    guard !elements.isEmpty else { return emptyTraceResult }
    let parameters = UtilityTraceParameters(
      traceType: utilityTraceType(traceTypeName), startingLocations: elements
    )
    return try await runTrace(network, parameters, select: false)
  }

  /// Queries a starting feature from `tableName` (by `whereClause`), traces from it by trace type,
  /// and selects the result features on the map.
  func traceFromQuery(_ tableName: String, _ whereClause: String, _ traceTypeName: String) async throws -> [String: Any] {
    guard let network, let element = try await queryStartElement(network, tableName, whereClause) else {
      return emptyTraceResult
    }
    let parameters = UtilityTraceParameters(
      traceType: utilityTraceType(traceTypeName), startingLocations: [element]
    )
    return try await runTrace(network, parameters, select: true)
  }

  /// Lists the network's named trace configurations (caches them for `traceWithConfiguration`).
  func queryNamedTraceConfigurations() async throws -> [[String: Any]] {
    guard let network else { return [] }
    let configs = try await network.queryNamedTraceConfigurations()
    var cache: [String: UtilityNamedTraceConfiguration] = [:]
    for config in configs { cache[config.globalID.uuidString] = config }
    namedConfigurations = cache
    return configs.map { ["name": $0.name, "globalId": $0.globalID.uuidString] }
  }

  /// Traces using a named configuration (by global id), from a feature queried from `tableName`.
  func traceWithConfiguration(_ configGlobalId: String, _ tableName: String, _ whereClause: String) async throws -> [String: Any] {
    guard let network, let config = namedConfigurations[configGlobalId],
      let element = try await queryStartElement(network, tableName, whereClause)
    else { return emptyTraceResult }
    let parameters = UtilityTraceParameters(namedTraceConfiguration: config, startingLocations: [element])
    return try await runTrace(network, parameters, select: true)
  }

  /// Returns the associations (connectivity / containment / attachment) of a queried element.
  func associations(_ tableName: String, _ whereClause: String) async throws -> [String: Any] {
    guard let network, let element = try await queryStartElement(network, tableName, whereClause) else {
      return ["count": 0, "kinds": []]
    }
    let associations = try await network.associations(for: element)
    let kinds = Set(associations.map { associationKindName($0.kind) })
    return ["count": associations.count, "kinds": Array(kinds)]
  }

  // MARK: - Helpers

  private func queryStartElement(_ network: UtilityNetwork, _ tableName: String, _ whereClause: String) async throws -> UtilityElement? {
    guard let table = featureLayers[tableName]?.featureTable as? ServiceFeatureTable else { return nil }
    let query = QueryParameters()
    query.whereClause = whereClause
    query.maxFeatures = 1
    let queryResult = try await table.queryFeatures(using: query)
    guard let feature = Array(queryResult.features()).first as? ArcGISFeature else { return nil }
    return network.makeElement(arcGISFeature: feature)
  }

  private func runTrace(_ network: UtilityNetwork, _ parameters: UtilityTraceParameters, select: Bool) async throws -> [String: Any] {
    let results = try await network.trace(using: parameters)
    let found = results.compactMap { $0 as? UtilityElementTraceResult }.first?.elements ?? []
    if select { await selectElements(found) }
    return [
      "elementCount": found.count,
      "elements": found.map(serializeUtilityElement),
    ]
  }

  /// Selects the trace-result features on their corresponding feature layers (best-effort).
  private func selectElements(_ elements: [UtilityElement]) async {
    for layer in featureLayers.values { layer.clearSelection() }
    let bySource = Dictionary(grouping: elements, by: { $0.networkSource.name })
    for (sourceName, group) in bySource {
      guard let layer = featureLayers[sourceName] else { continue }
      let query = QueryParameters()
      query.addObjectIDs(group.map { $0.objectID })
      _ = try? await layer.selectFeatures(using: query, mode: .new)
    }
  }

  private var emptyTraceResult: [String: Any] { ["elementCount": 0, "elements": []] }
}

/// Resolves a JS descriptor (asset-type path + global id) to a `UtilityElement` via the definition.
private func makeUtilityElement(_ network: UtilityNetwork, _ d: [String: Any]) -> UtilityElement? {
  guard let definition = network.definition,
    let sourceName = d["networkSource"] as? String,
    let groupName = d["assetGroup"] as? String,
    let typeName = d["assetType"] as? String,
    let globalIDString = d["globalId"] as? String,
    let globalID = UUID(uuidString: globalIDString.trimmingCharacters(in: CharacterSet(charactersIn: "{}"))),
    let source = definition.networkSource(named: sourceName),
    let group = source.assetGroup(named: groupName),
    let assetType = group.assetType(named: typeName)
  else { return nil }
  return network.makeElement(assetType: assetType, globalID: globalID)
}

private func serializeUtilityElement(_ element: UtilityElement) -> [String: Any] {
  [
    "objectId": element.objectID,
    "globalId": element.globalID.uuidString,
    "networkSource": element.networkSource.name,
    "assetGroup": element.assetGroup.name,
    "assetType": element.assetType.name,
  ]
}

/// Maps the JS trace-type union to the native nested `UtilityTraceParameters.TraceType`.
private func utilityTraceType(_ name: String) -> UtilityTraceParameters.TraceType {
  switch name {
  case "subnetwork": return .subnetwork
  case "upstream": return .upstream
  case "downstream": return .downstream
  case "isolation": return .isolation
  case "loops": return .loops
  case "shortestPath": return .shortestPath
  default: return .connected
  }
}

/// Maps a `UtilityAssociation.Kind` to a short JS string.
private func associationKindName(_ kind: UtilityAssociation.Kind) -> String {
  switch kind {
  case .connectivity: return "connectivity"
  case .containment: return "containment"
  case .attachment: return "attachment"
  default: return "junctionEdge"
  }
}
