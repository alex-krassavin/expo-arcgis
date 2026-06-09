import ArcGIS
import Foundation

/// Free functions backing the JS `geometryEngine` namespace. Each one decodes its
/// geometry arguments via `GeometryCodec`, calls `ArcGIS.GeometryEngine`, and encodes
/// the result back to a JS-friendly value (geometry dict / Double / Bool / array).
/// They are registered as module `Function`s in `ExpoArcgisModule`.

private func parseGeo(_ dict: [String: Any]?) -> Geometry? { dict.flatMap(geometryFromDict) }
private func parsePoint(_ dict: [String: Any]?) -> Point? { parseGeo(dict) as? Point }
private func encode(_ geometry: Geometry?) -> [String: Any]? { geometry.map(dictFromGeometry) }
private func encodeAll(_ geometries: [Geometry]) -> [[String: Any]] { geometries.map(dictFromGeometry) }

// MARK: - Projection & buffer

func geProject(_ g: [String: Any], _ wkid: Int) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.project(geometry, into: spatialReference(wkid: wkid)))
}

func geBuffer(_ g: [String: Any], _ distance: Double) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.buffer(around: geometry, distance: distance))
}

func geGeodeticBuffer(_ g: [String: Any], _ distance: Double, _ unit: String?, _ maxDeviation: Double?, _ curve: String?) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.geodeticBuffer(
    around: geometry, distance: distance, distanceUnit: linearUnit(unit),
    maxDeviation: maxDeviation ?? .nan, curveType: curveType(curve)
  ))
}

// MARK: - Measurement

func geArea(_ g: [String: Any]) -> Double { parseGeo(g).map(GeometryEngine.area(of:)) ?? 0 }

func geGeodeticArea(_ g: [String: Any], _ unit: String?, _ curve: String?) -> Double {
  guard let geometry = parseGeo(g) else { return 0 }
  return GeometryEngine.geodeticArea(of: geometry, unit: areaUnit(unit), curveType: curveType(curve))
}

func geLength(_ g: [String: Any]) -> Double { parseGeo(g).map(GeometryEngine.length(of:)) ?? 0 }

func geGeodeticLength(_ g: [String: Any], _ unit: String?, _ curve: String?) -> Double {
  guard let geometry = parseGeo(g) else { return 0 }
  return GeometryEngine.geodeticLength(of: geometry, lengthUnit: linearUnit(unit), curveType: curveType(curve))
}

func geDistance(_ a: [String: Any], _ b: [String: Any]) -> Double? {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return nil }
  return GeometryEngine.distance(from: g1, to: g2)
}

func geGeodeticDistance(_ a: [String: Any], _ b: [String: Any], _ unit: String?, _ curve: String?) -> [String: Any]? {
  guard let p1 = parsePoint(a), let p2 = parsePoint(b),
    let result = GeometryEngine.geodeticDistance(
      from: p1, to: p2, distanceUnit: linearUnit(unit), azimuthUnit: .degrees, curveType: curveType(curve)
    )
  else { return nil }
  return ["distance": result.distance.value, "azimuth1": result.azimuth1.value, "azimuth2": result.azimuth2.value]
}

// MARK: - Overlay / topological

func geUnion(_ geometries: [[String: Any]]) -> [String: Any]? {
  encode(GeometryEngine.union(of: geometries.compactMap(geometryFromDict)))
}

func geIntersection(_ a: [String: Any], _ b: [String: Any]) -> [String: Any]? {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return nil }
  return encode(GeometryEngine.intersection(g1, g2))
}

func geDifference(_ a: [String: Any], _ b: [String: Any]) -> [String: Any]? {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return nil }
  return encode(GeometryEngine.difference(g1, g2))
}

func geSymmetricDifference(_ a: [String: Any], _ b: [String: Any]) -> [String: Any]? {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return nil }
  return encode(GeometryEngine.symmetricDifference(g1, g2))
}

func geClip(_ g: [String: Any], _ envelope: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g), let env = parseGeo(envelope) as? Envelope else { return nil }
  return encode(GeometryEngine.clip(geometry, to: env))
}

func geCut(_ g: [String: Any], _ cutter: [String: Any]) -> [[String: Any]] {
  guard let geometry = parseGeo(g), let line = parseGeo(cutter) as? Polyline else { return [] }
  return encodeAll(GeometryEngine.cut(geometry, usingCutter: line))
}

func geConvexHull(_ g: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.convexHull(for: geometry))
}

func geLabelPoint(_ g: [String: Any]) -> [String: Any]? {
  guard let polygon = parseGeo(g) as? ArcGIS.Polygon else { return nil }
  return encode(GeometryEngine.labelPoint(for: polygon))
}

func geNormalizeCentralMeridian(_ g: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.normalizeCentralMeridian(of: geometry))
}

func geReshape(_ g: [String: Any], _ reshaper: [String: Any]) -> [String: Any]? {
  guard let line = parseGeo(reshaper) as? ArcGIS.Polyline else { return nil }
  let geometry = parseGeo(g)
  if let polyline = geometry as? ArcGIS.Polyline {
    return encode(GeometryEngine.reshape(polyline, usingReshaper: line))
  }
  if let polygon = geometry as? ArcGIS.Polygon {
    return encode(GeometryEngine.reshape(polygon, usingReshaper: line))
  }
  return nil
}

func geBoundary(_ g: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.boundary(of: geometry))
}

func geSimplify(_ g: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.simplify(geometry))
}

func geDensify(_ g: [String: Any], _ maxSegmentLength: Double) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.densify(geometry, maxSegmentLength: maxSegmentLength))
}

func geGeneralize(_ g: [String: Any], _ maxDeviation: Double, _ removeDegenerate: Bool) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.generalize(geometry, maxDeviation: maxDeviation, removeDegenerateParts: removeDegenerate))
}

func geOffset(_ g: [String: Any], _ distance: Double, _ type: String?, _ bevelRatio: Double, _ flattenError: Double) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.offset(
    geometry, byDistance: distance, offsetType: offsetType(type), bevelRatio: bevelRatio, flattenError: flattenError
  ))
}

func geCombineExtents(_ a: [String: Any], _ b: [String: Any]) -> [String: Any]? {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return nil }
  return encode(GeometryEngine.combineExtents(g1, g2))
}

// MARK: - Relational predicates

func geContains(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.doesGeometry(g1, contain: g2)
}
func geCrosses(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, crossing: g2)
}
func geDisjoint(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, disjointWith: g2)
}
func geEquals(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, equivalentTo: g2)
}
func geIntersects(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, intersecting: g2)
}
func geOverlaps(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, overlapping: g2)
}
func geTouches(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, touching: g2)
}
func geWithin(_ a: [String: Any], _ b: [String: Any]) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, within: g2)
}
func geRelate(_ a: [String: Any], _ b: [String: Any], _ relation: String) -> Bool {
  guard let g1 = parseGeo(a), let g2 = parseGeo(b) else { return false }
  return GeometryEngine.isGeometry(g1, relatedTo: g2, byRelation: relation)
}
func geIsSimple(_ g: [String: Any]) -> Bool { parseGeo(g).map(GeometryEngine.isSimple) ?? false }

// MARK: - Proximity

func geNearestCoordinate(_ g: [String: Any], _ p: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g), let pt = parsePoint(p),
    let result = GeometryEngine.nearestCoordinate(in: geometry, to: pt) else { return nil }
  return ["coordinate": dictFromGeometry(result.coordinate), "distance": result.distance]
}

func geNearestVertex(_ g: [String: Any], _ p: [String: Any]) -> [String: Any]? {
  guard let geometry = parseGeo(g), let pt = parsePoint(p),
    let result = GeometryEngine.nearestVertex(in: geometry, to: pt) else { return nil }
  return ["coordinate": dictFromGeometry(result.coordinate), "distance": result.distance]
}

// MARK: - Transformations

func geMove(_ g: [String: Any], _ deltaX: Double, _ deltaY: Double) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.move(geometry, deltaX: deltaX, deltaY: deltaY))
}

func geRotate(_ g: [String: Any], _ angle: Double, _ origin: [String: Any]?) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.rotate(geometry, by: angle, around: parsePoint(origin)))
}

func geScale(_ g: [String: Any], _ factorX: Double, _ factorY: Double, _ origin: [String: Any]?) -> [String: Any]? {
  guard let geometry = parseGeo(g) else { return nil }
  return encode(GeometryEngine.scale(geometry, factorX: factorX, factorY: factorY, relativeTo: parsePoint(origin)))
}
