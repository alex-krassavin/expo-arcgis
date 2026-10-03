package expo.modules.arcgistoolkit

import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference

/** A scene location from its JS form, `{ latitude, longitude, altitude? }` (WGS84, meters). */
internal fun arLocation(value: Any?): Point? {
  val map = value as? Map<*, *> ?: return null
  val latitude = (map["latitude"] as? Number)?.toDouble() ?: return null
  val longitude = (map["longitude"] as? Number)?.toDouble() ?: return null
  val altitude = (map["altitude"] as? Number)?.toDouble() ?: 0.0
  return Point(longitude, latitude, altitude, SpatialReference.wgs84())
}

internal fun double(value: Any?): Double? = (value as? Number)?.toDouble()

/** The payload of an `onInitializationStatusChange` event. */
internal fun statusPayload(status: String, error: Throwable? = null): Map<String, Any?> =
  buildMap {
    put("status", status)
    if (error != null) put("error", error.message ?: error.toString())
  }
