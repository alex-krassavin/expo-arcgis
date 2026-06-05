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
  params.addOrderByFields(buildOrderBy(dict["orderBy"]))
  return params
}

private func buildOrderBy(_ value: Any?) -> [OrderBy] {
  (value as? [[String: Any]] ?? []).compactMap { field -> OrderBy? in
    guard let fieldName = field["field"] as? String else { return nil }
    return OrderBy(fieldName: fieldName, sortOrder: (field["ascending"] as? Bool ?? true) ? .ascending : .descending)
  }
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

// MARK: - Statistics

func buildStatisticsQueryParameters(_ dict: [String: Any]) -> StatisticsQueryParameters {
  let definitions = (dict["statistics"] as? [[String: Any]] ?? []).compactMap { stat -> StatisticDefinition? in
    guard let field = stat["field"] as? String else { return nil }
    return StatisticDefinition(
      fieldName: field,
      statisticType: statisticType(stat["type"] as? String),
      outputAlias: stat["outName"] as? String ?? ""
    )
  }
  let params = StatisticsQueryParameters(statisticDefinitions: definitions)
  if let whereClause = dict["whereClause"] as? String { params.whereClause = whereClause }
  if let groupBy = dict["groupBy"] as? [String] { params.addGroupByFieldNames(groupBy) }
  params.addOrderByFields(buildOrderBy(dict["orderBy"]))
  return params
}

private func statisticType(_ value: String?) -> StatisticDefinition.StatisticType {
  switch value {
  case "count": return .count
  case "sum": return .sum
  case "min": return .minimum
  case "max": return .maximum
  case "standardDeviation": return .standardDeviation
  case "variance": return .variance
  default: return .average
  }
}

func serializeStatisticRecord(_ record: StatisticRecord) -> [String: Any] {
  ["group": serializeAttributes(record.group), "statistics": serializeAttributes(record.statistics)]
}
