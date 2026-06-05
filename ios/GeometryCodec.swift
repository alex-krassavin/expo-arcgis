import ArcGIS
import Foundation

/// Bidirectional codec between JS geometry dicts and ArcGIS `Geometry` objects.
///
/// JS shape (discriminated by `type`):
///   - `point`:      `{ type, x, y, z?, spatialReference? }`
///   - `multipoint`: `{ type, points: [{x,y,z?}], spatialReference? }`
///   - `polyline`:   `{ type, points?: [...], parts?: [[...]], spatialReference? }`
///   - `polygon`:    `{ type, points?: [...], parts?: [[...]], spatialReference? }`
///   - `envelope`:   `{ type, xMin, yMin, xMax, yMax, spatialReference? }`
///
/// `points` is a single-path/ring shorthand; the encoder always emits `parts`.

// MARK: - Decode (JS dict → ArcGIS Geometry)

func geometryFromDict(_ dict: [String: Any]) -> Geometry? {
  let sr = codecSpatialReference(dict["spatialReference"])
  switch dict["type"] as? String {
  case "point":
    return codecPoint(dict, spatialReference: sr)
  case "multipoint":
    return Multipoint(points: codecPointArray(dict["points"], spatialReference: sr))
  case "polyline":
    return Polyline(parts: codecParts(dict, spatialReference: sr))
  case "polygon":
    return Polygon(parts: codecParts(dict, spatialReference: sr))
  case "envelope":
    return Envelope(
      xMin: codecNumber(dict["xMin"]), yMin: codecNumber(dict["yMin"]),
      xMax: codecNumber(dict["xMax"]), yMax: codecNumber(dict["yMax"]),
      spatialReference: sr
    )
  default:
    return nil
  }
}

private func codecParts(_ dict: [String: Any], spatialReference sr: SpatialReference) -> [MutablePart] {
  if let parts = dict["parts"] as? [Any] {
    return parts.map { codecPart($0, spatialReference: sr) }
  }
  return [codecPart(dict["points"], spatialReference: sr)]
}

private func codecPart(_ value: Any?, spatialReference sr: SpatialReference) -> MutablePart {
  let part = MutablePart(spatialReference: sr)
  part.points.append(contentsOf: codecPointArray(value, spatialReference: sr))
  return part
}

private func codecPointArray(_ value: Any?, spatialReference sr: SpatialReference) -> [Point] {
  guard let array = value as? [[String: Any]] else { return [] }
  return array.map { codecPoint($0, spatialReference: sr) }
}

private func codecPoint(_ dict: [String: Any], spatialReference sr: SpatialReference) -> Point {
  if let z = dict["z"] as? NSNumber {
    return Point(
      x: codecNumber(dict["x"]), y: codecNumber(dict["y"]), z: z.doubleValue,
      spatialReference: sr
    )
  }
  return Point(x: codecNumber(dict["x"]), y: codecNumber(dict["y"]), spatialReference: sr)
}

/// Only WGS84 and Web Mercator are mapped by name; any other WKID is built from the id.
private func codecSpatialReference(_ value: Any?) -> SpatialReference {
  switch (value as? NSNumber)?.intValue {
  case .none, 4326: return .wgs84
  case 3857, 102100: return .webMercator
  case let wkid?:
    guard let id = WKID(wkid) else { return .wgs84 }
    return SpatialReference(wkid: id) ?? .wgs84
  }
}

private func codecNumber(_ value: Any?) -> Double {
  (value as? NSNumber)?.doubleValue ?? 0
}

// MARK: - Encode (ArcGIS Geometry → JS dict)

func dictFromGeometry(_ geometry: Geometry) -> [String: Any] {
  var result: [String: Any] = [:]
  result["spatialReference"] = geometry.spatialReference?.wkid?.rawValue

  switch geometry {
  case let point as Point:
    result["type"] = "point"
    result["x"] = point.x
    result["y"] = point.y
    if let z = point.z { result["z"] = z }
  case let multipoint as Multipoint:
    result["type"] = "multipoint"
    result["points"] = multipoint.points.map(pointDict)
  case let polygon as Polygon:
    result["type"] = "polygon"
    result["parts"] = partsDicts(polygon)
  case let polyline as Polyline:
    result["type"] = "polyline"
    result["parts"] = partsDicts(polyline)
  case let envelope as Envelope:
    result["type"] = "envelope"
    result["xMin"] = envelope.xMin
    result["yMin"] = envelope.yMin
    result["xMax"] = envelope.xMax
    result["yMax"] = envelope.yMax
  default:
    break
  }
  return result
}

private func partsDicts(_ multipart: Multipart) -> [[[String: Any]]] {
  multipart.parts.map { part in part.points.map(pointDict) }
}

private func pointDict(_ point: Point) -> [String: Any] {
  var dict: [String: Any] = ["x": point.x, "y": point.y]
  if let z = point.z { dict["z"] = z }
  return dict
}
