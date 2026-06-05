import ArcGIS
import Foundation

/// Builds `QueryParameters` from a JS query dict and serializes `Feature`s back to JS.
/// Shared by `FeatureLayerRef`'s async query functions.

func buildQueryParameters(_ dict: [String: Any]?) -> QueryParameters {
  let params = QueryParameters()
  guard let dict else { return params }
  if let whereClause = dict["whereClause"] as? String { params.whereClause = whereClause }
  if let geometryDict = dict["geometry"] as? [String: Any] { params.geometry = geometryFromDict(geometryDict) }
  if let relationship = dict["spatialRelationship"] as? String {
    params.spatialRelationship = querySpatialRelationship(relationship)
  }
  if let maxFeatures = dict["maxFeatures"] as? NSNumber { params.maxFeatures = maxFeatures.intValue }
  if let returnGeometry = dict["returnGeometry"] as? Bool { params.returnsGeometry = returnGeometry }
  if let resultOffset = dict["resultOffset"] as? NSNumber { params.resultOffset = resultOffset.intValue }
  if let objectIds = dict["objectIds"] as? [NSNumber] { params.addObjectIDs(objectIds.map(\.intValue)) }
  if let orderBy = dict["orderBy"] as? [[String: Any]] {
    params.addOrderByFields(orderBy.compactMap { field -> OrderBy? in
      guard let fieldName = field["field"] as? String else { return nil }
      return OrderBy(fieldName: fieldName, sortOrder: (field["ascending"] as? Bool ?? true) ? .ascending : .descending)
    })
  }
  return params
}

private func querySpatialRelationship(_ value: String) -> SpatialRelationship {
  switch value {
  case "contains": return .contains
  case "crosses": return .crosses
  case "disjoint": return .disjoint
  case "envelopeIntersects": return .envelopeIntersects
  case "equals": return .equals
  case "overlaps": return .overlaps
  case "touches": return .touches
  case "within": return .within
  case "relate": return .relate
  default: return .intersects
  }
}

func serializeFeature(_ feature: Feature) -> [String: Any] {
  var result: [String: Any] = ["attributes": serializeAttributes(feature.attributes)]
  if let geometry = feature.geometry { result["geometry"] = dictFromGeometry(geometry) }
  return result
}

/// Converts feature attributes to JS-friendly values (dates → epoch milliseconds).
func serializeAttributes(_ attributes: [String: any Sendable]) -> [String: Any] {
  var result: [String: Any] = [:]
  for (key, value) in attributes {
    if let date = value as? Date {
      result[key] = date.timeIntervalSince1970 * 1000
    } else {
      result[key] = value
    }
  }
  return result
}
