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
  params.addOrderByFields(parseOrderByFields(dict["orderByFields"]))
  return params
}

/// Parses `["POP DESC", "NAME ASC"]` strings into `OrderBy` objects.
/// Each token is split on the last whitespace; the optional trailing word selects the sort order.
private func parseOrderByFields(_ value: Any?) -> [OrderBy] {
  guard let strings = value as? [String] else { return [] }
  return strings.compactMap { token -> OrderBy? in
    let parts = token.split(separator: " ", maxSplits: 1).map { String($0) }
    guard !parts.isEmpty else { return nil }
    let fieldName = parts[0]
    let ascending = parts.count < 2 || parts[1].uppercased() != "DESC"
    return OrderBy(fieldName: fieldName, sortOrder: ascending ? .ascending : .descending)
  }
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

/// Serializes a feature, restricting attributes to `outFields` when provided (non-empty).
/// Pass `["*"]` or an empty array to include all fields.
func serializeFeature(_ feature: Feature, outFields: [String]) -> [String: Any] {
  var result = serializeFeature(feature)
  if !outFields.isEmpty, outFields != ["*"] {
    let filtered = (result["attributes"] as? [String: Any] ?? [:]).filter { outFields.contains($0.key) }
    result["attributes"] = filtered
  }
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

// MARK: - Editing

/// Applies JS attribute values onto a feature (used by add / update).
func applyAttributes(_ feature: Feature, _ attributes: [String: Any]) {
  for (key, value) in attributes {
    feature.setAttributeValue(sendableValue(value), forKey: key)
  }
}

func sendableValue(_ value: Any) -> (any Sendable)? {
  switch value {
  case let bool as Bool: return bool
  case let int as Int: return int
  case let double as Double: return double
  case let string as String: return string
  case let number as NSNumber: return number.doubleValue
  default: return nil
  }
}

// MARK: - Identify

/// Serializes one layer's identify hits — its name and the identified features.
func serializeIdentifyResult(_ result: IdentifyLayerResult) -> [String: Any] {
  [
    "layerName": result.layerContent.name,
    "features": result.geoElements.compactMap { $0 as? Feature }.map(serializeFeature),
  ]
}

/// Evaluates each identified popup and flattens its fields into `{ title, fields: [{label, value}] }`.
func serializePopups(_ results: [IdentifyLayerResult]) async -> [[String: Any]] {
  var output: [[String: Any]] = []
  for result in results {
    for popup in result.popups {
      _ = try? await popup.evaluateExpressions()
      var fields: [[String: Any]] = []
      for element in popup.evaluatedElements {
        if let fieldsElement = element as? FieldsPopupElement {
          for (label, value) in zip(fieldsElement.labels, fieldsElement.formattedValues) {
            fields.append(["label": label, "value": value])
          }
        }
      }
      output.append(["title": popup.title, "fields": fields])
    }
  }
  return output
}
