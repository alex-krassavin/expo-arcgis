package expo.modules.arcgis

import com.arcgismaps.geometry.Envelope
import com.arcgismaps.geometry.GeodesicEllipseParameters
import com.arcgismaps.geometry.GeodesicSectorParameters
import com.arcgismaps.geometry.Geometry
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Multipart
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.Polygon
import com.arcgismaps.geometry.Polyline

/**
 * Free functions backing the JS `geometryEngine` namespace. Each decodes its geometry
 * arguments via [geometryFromDict], calls [GeometryEngine] (a Kotlin object), and encodes
 * the result via [dictFromGeometry]. Registered as module `Function`s in `ExpoArcgisModule`.
 */

private fun parseGeo(dict: Map<String, Any?>?): Geometry? = dict?.let { geometryFromDict(it) }
private fun parsePoint(dict: Map<String, Any?>?): Point? = parseGeo(dict) as? Point
private fun encode(g: Geometry?): Map<String, Any?>? = g?.let { dictFromGeometry(it) }
private fun encodeAll(gs: List<Geometry>): List<Map<String, Any?>> = gs.map { dictFromGeometry(it) }

// region Projection & buffer

internal fun geProject(g: Map<String, Any?>, wkid: Int): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.projectOrNull(it, spatialReference(wkid))) }

internal fun geBuffer(g: Map<String, Any?>, distance: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.bufferOrNull(it, distance)) }

internal fun geGeodeticBuffer(
  g: Map<String, Any?>,
  distance: Double,
  unit: String?,
  maxDeviation: Double?,
  curve: String?,
): Map<String, Any?>? = parseGeo(g)?.let {
  encode(GeometryEngine.bufferGeodeticOrNull(it, distance, linearUnit(unit), maxDeviation ?: Double.NaN, curveType(curve)))
}

// region Measurement

internal fun geArea(g: Map<String, Any?>): Double = parseGeo(g)?.let { GeometryEngine.area(it) } ?: 0.0

internal fun geGeodeticArea(g: Map<String, Any?>, unit: String?, curve: String?): Double =
  parseGeo(g)?.let { GeometryEngine.areaGeodetic(it, areaUnit(unit), curveType(curve)) } ?: 0.0

internal fun geLength(g: Map<String, Any?>): Double = parseGeo(g)?.let { GeometryEngine.length(it) } ?: 0.0

internal fun geGeodeticLength(g: Map<String, Any?>, unit: String?, curve: String?): Double =
  parseGeo(g)?.let { GeometryEngine.lengthGeodetic(it, linearUnit(unit), curveType(curve)) } ?: 0.0

internal fun geDistance(a: Map<String, Any?>, b: Map<String, Any?>): Double? {
  val g1 = parseGeo(a) ?: return null
  val g2 = parseGeo(b) ?: return null
  return GeometryEngine.distanceOrNull(g1, g2)
}

internal fun geGeodeticDistance(
  a: Map<String, Any?>,
  b: Map<String, Any?>,
  unit: String?,
  curve: String?,
): Map<String, Any?>? {
  val p1 = parsePoint(a) ?: return null
  val p2 = parsePoint(b) ?: return null
  val result = GeometryEngine.distanceGeodeticOrNull(p1, p2, linearUnit(unit), angularUnit(null), curveType(curve))
    ?: return null
  return mapOf("distance" to result.distance, "azimuth1" to result.azimuth1, "azimuth2" to result.azimuth2)
}

// region Overlay / topological

internal fun geUnion(geometries: List<Map<String, Any?>>): Map<String, Any?>? =
  encode(GeometryEngine.unionOrNull(geometries.mapNotNull { geometryFromDict(it) }))

internal fun geIntersection(a: Map<String, Any?>, b: Map<String, Any?>): Map<String, Any?>? {
  val g1 = parseGeo(a) ?: return null
  val g2 = parseGeo(b) ?: return null
  return encode(GeometryEngine.intersectionOrNull(g1, g2))
}

internal fun geDifference(a: Map<String, Any?>, b: Map<String, Any?>): Map<String, Any?>? {
  val g1 = parseGeo(a) ?: return null
  val g2 = parseGeo(b) ?: return null
  return encode(GeometryEngine.differenceOrNull(g1, g2))
}

internal fun geSymmetricDifference(a: Map<String, Any?>, b: Map<String, Any?>): Map<String, Any?>? {
  val g1 = parseGeo(a) ?: return null
  val g2 = parseGeo(b) ?: return null
  return encode(GeometryEngine.symmetricDifferenceOrNull(g1, g2))
}

internal fun geClip(g: Map<String, Any?>, envelope: Map<String, Any?>): Map<String, Any?>? {
  val geometry = parseGeo(g) ?: return null
  val env = parseGeo(envelope) as? Envelope ?: return null
  return encode(GeometryEngine.clipOrNull(geometry, env))
}

internal fun geCut(g: Map<String, Any?>, cutter: Map<String, Any?>): List<Map<String, Any?>> {
  val geometry = parseGeo(g) ?: return emptyList()
  val line = parseGeo(cutter) as? Polyline ?: return emptyList()
  return encodeAll(GeometryEngine.tryCut(geometry, line))
}

internal fun geConvexHull(g: Map<String, Any?>): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.convexHullOrNull(it)) }

internal fun geLabelPoint(g: Map<String, Any?>): Map<String, Any?>? =
  (parseGeo(g) as? Polygon)?.let { encode(GeometryEngine.labelPointOrNull(it)) }

internal fun geNormalizeCentralMeridian(g: Map<String, Any?>): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.normalizeCentralMeridian(it)) }

internal fun geReshape(g: Map<String, Any?>, reshaper: Map<String, Any?>): Map<String, Any?>? {
  val multipart = parseGeo(g) as? Multipart ?: return null
  val line = parseGeo(reshaper) as? Polyline ?: return null
  return encode(GeometryEngine.reshape(multipart, line))
}

internal fun geIntersections(a: Map<String, Any?>, b: Map<String, Any?>): List<Map<String, Any?>> {
  val g1 = parseGeo(a) ?: return emptyList()
  val g2 = parseGeo(b) ?: return emptyList()
  return GeometryEngine.tryIntersections(g1, g2).mapNotNull { encode(it) }
}

internal fun geExtend(p: Map<String, Any?>, extender: Map<String, Any?>): Map<String, Any?>? {
  val polyline = parseGeo(p) as? Polyline ?: return null
  val ext = parseGeo(extender) as? Polyline ?: return null
  return encode(GeometryEngine.extend(polyline, ext, emptySet()))
}

internal fun geAutoComplete(
  existing: List<Map<String, Any?>>,
  boundaries: List<Map<String, Any?>>,
): List<Map<String, Any?>> {
  val polygons = existing.mapNotNull { parseGeo(it) as? Polygon }
  val lines = boundaries.mapNotNull { parseGeo(it) as? Polyline }
  return GeometryEngine.tryAutoComplete(polygons, lines).mapNotNull { encode(it) }
}

internal fun geBoundary(g: Map<String, Any?>): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.boundaryOrNull(it)) }

internal fun geSimplify(g: Map<String, Any?>): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.simplifyOrNull(it)) }

internal fun geDensify(g: Map<String, Any?>, maxSegmentLength: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.densifyOrNull(it, maxSegmentLength)) }

internal fun geGeneralize(g: Map<String, Any?>, maxDeviation: Double, removeDegenerate: Boolean): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.generalizeOrNull(it, maxDeviation, removeDegenerate)) }

internal fun geOffset(
  g: Map<String, Any?>,
  distance: Double,
  type: String?,
  bevelRatio: Double,
  flattenError: Double,
): Map<String, Any?>? = parseGeo(g)?.let {
  encode(GeometryEngine.offsetOrNull(it, distance, offsetType(type), bevelRatio, flattenError))
}

internal fun geCombineExtents(a: Map<String, Any?>, b: Map<String, Any?>): Map<String, Any?>? {
  val g1 = parseGeo(a) ?: return null
  val g2 = parseGeo(b) ?: return null
  return encode(GeometryEngine.combineExtentsOrNull(g1, g2))
}

// region Relational predicates

internal fun geContains(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.contains(g1, g2)
}
internal fun geCrosses(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.crosses(g1, g2)
}
internal fun geDisjoint(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.disjoint(g1, g2)
}
internal fun geEquals(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.equals(g1, g2)
}
internal fun geIntersects(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.intersects(g1, g2)
}
internal fun geOverlaps(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.overlaps(g1, g2)
}
internal fun geTouches(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.touches(g1, g2)
}
internal fun geWithin(a: Map<String, Any?>, b: Map<String, Any?>): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.within(g1, g2)
}
internal fun geRelate(a: Map<String, Any?>, b: Map<String, Any?>, relation: String): Boolean {
  val g1 = parseGeo(a) ?: return false
  val g2 = parseGeo(b) ?: return false
  return GeometryEngine.relate(g1, g2, relation)
}
internal fun geIsSimple(g: Map<String, Any?>): Boolean = parseGeo(g)?.let { GeometryEngine.isSimple(it) } ?: false

// region Proximity

internal fun geNearestCoordinate(g: Map<String, Any?>, p: Map<String, Any?>): Map<String, Any?>? {
  val geometry = parseGeo(g) ?: return null
  val pt = parsePoint(p) ?: return null
  val result = GeometryEngine.nearestCoordinate(geometry, pt) ?: return null
  return mapOf("coordinate" to dictFromGeometry(result.coordinate), "distance" to result.distance)
}

internal fun geNearestVertex(g: Map<String, Any?>, p: Map<String, Any?>): Map<String, Any?>? {
  val geometry = parseGeo(g) ?: return null
  val pt = parsePoint(p) ?: return null
  val result = GeometryEngine.nearestVertex(geometry, pt) ?: return null
  return mapOf("coordinate" to dictFromGeometry(result.coordinate), "distance" to result.distance)
}

// region Transformations

internal fun geMove(g: Map<String, Any?>, deltaX: Double, deltaY: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.move(it, deltaX, deltaY)) }

internal fun geRotate(g: Map<String, Any?>, angle: Double, origin: Map<String, Any?>?): Map<String, Any?>? {
  val geometry = parseGeo(g) ?: return null
  val pivot = parsePoint(origin)
  return encode(if (pivot != null) GeometryEngine.rotate(geometry, angle, pivot) else GeometryEngine.rotate(geometry, angle))
}

internal fun geScale(
  g: Map<String, Any?>,
  factorX: Double,
  factorY: Double,
  origin: Map<String, Any?>?,
): Map<String, Any?>? {
  val geometry = parseGeo(g) ?: return null
  val pivot = parsePoint(origin)
  return encode(
    if (pivot != null) GeometryEngine.scale(geometry, factorX, factorY, pivot)
    else GeometryEngine.scale(geometry, factorX, factorY),
  )
}

// region Z / M builders

internal fun geWithZ(g: Map<String, Any?>, z: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.createWithZOrNull(it, z)) }

internal fun geWithM(g: Map<String, Any?>, m: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.createWithMOrNull(it, m)) }

internal fun geWithZAndM(g: Map<String, Any?>, z: Double, m: Double): Map<String, Any?>? =
  parseGeo(g)?.let { encode(GeometryEngine.createWithZAndMOrNull(it, z, m)) }

// region Geodesic construction

internal fun geEllipseGeodesic(params: Map<String, Any?>): Map<String, Any?>? {
  val centerDict = params["center"] as? Map<String, Any?> ?: return null
  val center = parsePoint(centerDict) ?: return null

  val semiAxis1Length = (params["semiAxis1Length"] as? Number)?.toDouble() ?: 0.0
  val semiAxis2Length = (params["semiAxis2Length"] as? Number)?.toDouble() ?: 0.0
  val axisDirection   = (params["axisDirection"] as? Number)?.toDouble() ?: 0.0
  val angUnit         = angularUnit(params["angularUnit"] as? String)
  val linUnit         = linearUnit(params["linearUnit"] as? String)
  val maxSegLen       = (params["maxSegmentLength"] as? Number)?.toDouble() ?: 0.0
  val maxPtCount      = (params["maxPointCount"] as? Number)?.toLong() ?: 10L
  val geoType         = params["geometryType"] as? String

  val p: GeodesicEllipseParameters = when (geoType) {
    "polyline"   -> GeodesicEllipseParameters.Companion.createForPolyline()
    "multipoint" -> GeodesicEllipseParameters.Companion.createForMultipoint()
    else         -> GeodesicEllipseParameters.Companion.createForPolygon()
  }
  p.center = center
  p.semiAxis1Length = semiAxis1Length
  p.semiAxis2Length = semiAxis2Length
  p.axisDirection = axisDirection
  p.angularUnit = angUnit
  p.linearUnit = linUnit
  p.maxSegmentLength = maxSegLen
  p.maxPointCount = maxPtCount

  return encode(GeometryEngine.ellipseGeodesicOrNull(p))
}

internal fun geSectorGeodesic(params: Map<String, Any?>): Map<String, Any?>? {
  val centerDict = params["center"] as? Map<String, Any?> ?: return null
  val center = parsePoint(centerDict) ?: return null

  val semiAxis1Length = (params["semiAxis1Length"] as? Number)?.toDouble() ?: 0.0
  val semiAxis2Length = (params["semiAxis2Length"] as? Number)?.toDouble() ?: 0.0
  val axisDirection   = (params["axisDirection"] as? Number)?.toDouble() ?: 0.0
  val sectorAngle     = (params["sectorAngle"] as? Number)?.toDouble() ?: 0.0
  val startDirection  = (params["startDirection"] as? Number)?.toDouble() ?: 0.0
  val angUnit         = angularUnit(params["angularUnit"] as? String)
  val linUnit         = linearUnit(params["linearUnit"] as? String)
  val maxSegLen       = (params["maxSegmentLength"] as? Number)?.toDouble() ?: 0.0
  val maxPtCount      = (params["maxPointCount"] as? Number)?.toLong() ?: 10L
  val geoType         = params["geometryType"] as? String

  val p: GeodesicSectorParameters = when (geoType) {
    "polyline"   -> GeodesicSectorParameters.Companion.createForPolyline()
    "multipoint" -> GeodesicSectorParameters.Companion.createForMultipoint()
    else         -> GeodesicSectorParameters.Companion.createForPolygon()
  }
  p.center = center
  p.semiAxis1Length = semiAxis1Length
  p.semiAxis2Length = semiAxis2Length
  p.axisDirection = axisDirection
  p.sectorAngle = sectorAngle
  p.startDirection = startDirection
  p.angularUnit = angUnit
  p.linearUnit = linUnit
  p.maxSegmentLength = maxSegLen
  p.maxPointCount = maxPtCount

  return encode(GeometryEngine.sectorGeodesicOrNull(p))
}
