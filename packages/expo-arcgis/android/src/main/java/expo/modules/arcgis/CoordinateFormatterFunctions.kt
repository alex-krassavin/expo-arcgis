package expo.modules.arcgis

import com.arcgismaps.geometry.CoordinateFormatter
import com.arcgismaps.geometry.Point

/**
 * Free functions backing the JS `coordinateFormatter` namespace. They convert a `point`
 * geometry to/from latitude-longitude, MGRS, USNG and UTM notation strings via
 * [CoordinateFormatter] (a Kotlin object). Registered as module `Function`s in `ExpoArcgisModule`.
 */

private fun cfPoint(dict: Map<String, Any?>?): Point? = dict?.let { geometryFromDict(it) } as? Point

// region Latitude-longitude

internal fun cfToLatLong(p: Map<String, Any?>, format: String?, decimalPlaces: Int): String? =
  cfPoint(p)?.let { CoordinateFormatter.toLatitudeLongitudeOrNull(it, latitudeLongitudeFormat(format), decimalPlaces) }

internal fun cfFromLatLong(coordinates: String, wkid: Int): Map<String, Any?>? =
  CoordinateFormatter.fromLatitudeLongitudeOrNull(coordinates, spatialReference(wkid))?.let { dictFromGeometry(it) }

// region MGRS

internal fun cfToMgrs(p: Map<String, Any?>, mode: String?, precision: Int, addSpaces: Boolean): String? =
  cfPoint(p)?.let { CoordinateFormatter.toMgrsOrNull(it, mgrsConversionMode(mode), precision, addSpaces) }

internal fun cfFromMgrs(coordinates: String, wkid: Int, mode: String?): Map<String, Any?>? =
  CoordinateFormatter.fromMgrsOrNull(coordinates, spatialReference(wkid), mgrsConversionMode(mode))?.let { dictFromGeometry(it) }

// region USNG

internal fun cfToUsng(p: Map<String, Any?>, precision: Int, addSpaces: Boolean): String? =
  cfPoint(p)?.let { CoordinateFormatter.toUsngOrNull(it, precision, addSpaces) }

internal fun cfFromUsng(coordinates: String, wkid: Int): Map<String, Any?>? =
  CoordinateFormatter.fromUsngOrNull(coordinates, spatialReference(wkid))?.let { dictFromGeometry(it) }

// region UTM

internal fun cfToUtm(p: Map<String, Any?>, mode: String?, addSpaces: Boolean): String? =
  cfPoint(p)?.let { CoordinateFormatter.toUtmOrNull(it, utmConversionMode(mode), addSpaces) }

internal fun cfFromUtm(coordinates: String, wkid: Int, mode: String?): Map<String, Any?>? =
  CoordinateFormatter.fromUtmOrNull(coordinates, spatialReference(wkid), utmConversionMode(mode))?.let { dictFromGeometry(it) }
