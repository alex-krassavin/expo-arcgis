package expo.modules.arcgis

import com.arcgismaps.geometry.AngularUnit
import com.arcgismaps.geometry.AngularUnitId
import com.arcgismaps.geometry.AreaUnit
import com.arcgismaps.geometry.AreaUnitId
import com.arcgismaps.geometry.Envelope
import com.arcgismaps.geometry.GeodeticCurveType
import com.arcgismaps.geometry.Geometry
import com.arcgismaps.geometry.GeometryOffsetType
import com.arcgismaps.geometry.LinearUnit
import com.arcgismaps.geometry.LinearUnitId
import com.arcgismaps.geometry.Multipart
import com.arcgismaps.geometry.Multipoint
import com.arcgismaps.geometry.MutablePart
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.Polygon
import com.arcgismaps.geometry.Polyline
import com.arcgismaps.geometry.SpatialReference

/**
 * Bidirectional codec between JS geometry dicts and ArcGIS [Geometry] objects.
 *
 * JS shape (discriminated by `type`):
 *   - `point`:      `{ type, x, y, z?, spatialReference? }`
 *   - `multipoint`: `{ type, points: [{x,y,z?}], spatialReference? }`
 *   - `polyline`:   `{ type, points?: [...], parts?: [[...]], spatialReference? }`
 *   - `polygon`:    `{ type, points?: [...], parts?: [[...]], spatialReference? }`
 *   - `envelope`:   `{ type, xMin, yMin, xMax, yMax, spatialReference? }`
 *
 * `points` is a single-path/ring shorthand; the encoder always emits `parts`.
 */

// region Decode (JS dict → ArcGIS Geometry)

internal fun geometryFromDict(dict: Map<*, *>): Geometry? {
  val sr = codecSpatialRef(dict["spatialReference"])
  return when (dict["type"]) {
    "point" -> codecPoint(dict, sr)
    "multipoint" -> Multipoint(codecPointList(dict["points"], sr), sr)
    "polyline" -> Polyline(codecParts(dict, sr))
    "polygon" -> Polygon(codecParts(dict, sr))
    "envelope" -> Envelope(
      Point(codecNum(dict["xMin"]), codecNum(dict["yMin"]), sr),
      Point(codecNum(dict["xMax"]), codecNum(dict["yMax"]), sr),
    )
    else -> null
  }
}

private fun codecParts(dict: Map<*, *>, sr: SpatialReference): List<MutablePart> {
  val parts = dict["parts"] as? List<*>
  if (parts != null) return parts.map { codecPart(it, sr) }
  return listOf(codecPart(dict["points"], sr))
}

private fun codecPart(value: Any?, sr: SpatialReference): MutablePart {
  val part = MutablePart(sr)
  codecPointList(value, sr).forEach { part.addPoint(it) }
  return part
}

private fun codecPointList(value: Any?, sr: SpatialReference): List<Point> =
  (value as? List<*>)?.mapNotNull { (it as? Map<*, *>)?.let { p -> codecPoint(p, sr) } } ?: emptyList()

private fun codecPoint(dict: Map<*, *>, sr: SpatialReference): Point {
  val z = (dict["z"] as? Number)?.toDouble()
  return if (z != null) Point(codecNum(dict["x"]), codecNum(dict["y"]), z, sr)
  else Point(codecNum(dict["x"]), codecNum(dict["y"]), sr)
}

/** Only WGS84 and Web Mercator are mapped by name; any other WKID is built from the id. */
private fun codecSpatialRef(value: Any?): SpatialReference = when (val wkid = (value as? Number)?.toInt()) {
  null, 4326 -> SpatialReference.wgs84()
  3857, 102100 -> SpatialReference.webMercator()
  else -> SpatialReference(wkid)
}

private fun codecNum(value: Any?): Double = (value as? Number)?.toDouble() ?: 0.0

// region Encode (ArcGIS Geometry → JS dict)

internal fun dictFromGeometry(geometry: Geometry): Map<String, Any?> {
  val result = mutableMapOf<String, Any?>()
  geometry.spatialReference?.let { result["spatialReference"] = it.wkid }
  when (geometry) {
    is Point -> {
      result["type"] = "point"
      result["x"] = geometry.x
      result["y"] = geometry.y
      geometry.z?.let { result["z"] = it }
    }
    is Multipoint -> {
      result["type"] = "multipoint"
      result["points"] = geometry.points.map { pointDict(it) }
    }
    is Polygon -> {
      result["type"] = "polygon"
      result["parts"] = partsDicts(geometry)
    }
    is Polyline -> {
      result["type"] = "polyline"
      result["parts"] = partsDicts(geometry)
    }
    is Envelope -> {
      result["type"] = "envelope"
      result["xMin"] = geometry.xMin
      result["yMin"] = geometry.yMin
      result["xMax"] = geometry.xMax
      result["yMax"] = geometry.yMax
    }
  }
  return result
}

private fun partsDicts(multipart: Multipart): List<List<Map<String, Any?>>> =
  multipart.parts.map { part -> part.points.map { pointDict(it) } }

private fun pointDict(point: Point): Map<String, Any?> {
  val dict = mutableMapOf<String, Any?>("x" to point.x, "y" to point.y)
  point.z?.let { dict["z"] = it }
  return dict
}

// region Spatial reference & units (shared with GeometryEngine)

/** Builds a [SpatialReference] from a WKID (well-known coordinate-system id). */
internal fun spatialReference(wkid: Int): SpatialReference = when (wkid) {
  4326 -> SpatialReference.wgs84()
  3857, 102100 -> SpatialReference.webMercator()
  else -> SpatialReference(wkid)
}

internal fun linearUnit(id: String?): LinearUnit = LinearUnit(
  when (id) {
    "kilometers" -> LinearUnitId.Kilometers
    "feet" -> LinearUnitId.Feet
    "miles" -> LinearUnitId.Miles
    "nauticalMiles" -> LinearUnitId.NauticalMiles
    "yards" -> LinearUnitId.Yards
    else -> LinearUnitId.Meters
  },
)

internal fun areaUnit(id: String?): AreaUnit = AreaUnit(
  when (id) {
    "squareKilometers" -> AreaUnitId.SquareKilometers
    "squareFeet" -> AreaUnitId.SquareFeet
    "squareMiles" -> AreaUnitId.SquareMiles
    "acres" -> AreaUnitId.Acres
    "hectares" -> AreaUnitId.Hectares
    else -> AreaUnitId.SquareMeters
  },
)

internal fun angularUnit(id: String?): AngularUnit =
  AngularUnit(if (id == "radians") AngularUnitId.Radians else AngularUnitId.Degrees)

internal fun curveType(id: String?): GeodeticCurveType = when (id) {
  "loxodrome" -> GeodeticCurveType.Loxodrome
  "greatElliptic" -> GeodeticCurveType.GreatElliptic
  "normalSection" -> GeodeticCurveType.NormalSection
  "shapePreserving" -> GeodeticCurveType.ShapePreserving
  else -> GeodeticCurveType.Geodesic
}

internal fun offsetType(id: String?): GeometryOffsetType = when (id) {
  "bevelled" -> GeometryOffsetType.Bevelled
  "rounded" -> GeometryOffsetType.Rounded
  "squared" -> GeometryOffsetType.Squared
  else -> GeometryOffsetType.Mitered
}
