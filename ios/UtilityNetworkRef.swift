import ArcGIS
import ExpoModulesCore
import Foundation

/// SharedObject wrapping a native `UtilityNetwork` loaded from a feature service's service
/// geodatabase. Built + loaded by the `<UtilityNetwork>` component, which then runs traces.
public final class UtilityNetworkRef: SharedObject {
  private let serviceGeodatabaseUrl: String
  private var network: UtilityNetwork?

  init(serviceGeodatabaseUrl: String) {
    self.serviceGeodatabaseUrl = serviceGeodatabaseUrl
    super.init()
  }

  /// Builds the network from the service geodatabase, loads it, adds it to the map, returns its name.
  func load(_ mapRef: MapRef) async throws -> String {
    guard let url = URL(string: serviceGeodatabaseUrl) else { return "" }
    let serviceGeodatabase = ServiceGeodatabase(url: url)
    try await serviceGeodatabase.load()
    let network = UtilityNetwork(serviceGeodatabase: serviceGeodatabase)
    try await network.load()
    self.network = network
    mapRef.map.addUtilityNetwork(network)
    return network.name
  }

  /// Runs a trace from the given starting-location descriptors and serializes the element results.
  func trace(_ traceTypeName: String, _ startingLocations: [[String: Any]]) async throws -> [String: Any] {
    guard let network else { return ["elementCount": 0, "elements": []] }
    let elements = startingLocations.compactMap { makeUtilityElement(network, $0) }
    let parameters = UtilityTraceParameters(
      traceType: utilityTraceType(traceTypeName), startingLocations: elements
    )
    let results = try await network.trace(using: parameters)
    let found = results.compactMap { $0 as? UtilityElementTraceResult }.first?.elements ?? []
    return [
      "elementCount": found.count,
      "elements": found.map(serializeUtilityElement),
    ]
  }
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
