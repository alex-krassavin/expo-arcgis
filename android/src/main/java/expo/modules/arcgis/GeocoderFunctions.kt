package expo.modules.arcgis

import com.arcgismaps.geometry.Point
import com.arcgismaps.tasks.geocode.GeocodeParameters
import com.arcgismaps.tasks.geocode.GeocodeResult
import com.arcgismaps.tasks.geocode.LocatorTask
import com.arcgismaps.tasks.geocode.ReverseGeocodeParameters
import com.arcgismaps.tasks.geocode.SuggestParameters
import com.arcgismaps.tasks.geocode.SuggestResult
import java.util.concurrent.ConcurrentHashMap

/**
 * Free functions backing the JS `geocoder` namespace — forward / reverse geocoding via a
 * [LocatorTask]. Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.
 */

private const val WORLD_GEOCODER =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"

/** Caches one [LocatorTask] per service URL so repeated geocodes don't reload service metadata. */
private val locators = ConcurrentHashMap<String, LocatorTask>()

private fun locatorTask(params: Map<String, Any?>): LocatorTask {
  val url = params["locatorUrl"] as? String ?: WORLD_GEOCODER
  return locators.getOrPut(url) { LocatorTask(url) }
}

internal suspend fun geocode(searchText: String, params: Map<String, Any?>): List<Map<String, Any?>> {
  val locator = locatorTask(params)
  val parameters = buildGeocodeParameters(params)
  @Suppress("UNCHECKED_CAST")
  val searchValues = (params["searchValues"] as? Map<*, *>)
    ?.mapNotNull { (k, v) -> if (k is String && v is String) k to v else null }
    ?.toMap()
  return if (!searchValues.isNullOrEmpty()) {
    locator.geocode(searchValues, parameters).getOrThrow()
  } else {
    locator.geocode(searchText, parameters).getOrThrow()
  }.map { serializeGeocodeResult(it) }
}

internal suspend fun reverseGeocode(point: Map<String, Any?>, params: Map<String, Any?>): List<Map<String, Any?>> {
  val location = geometryFromDict(point) as? Point ?: return emptyList()
  return locatorTask(params).reverseGeocode(location, buildReverseGeocodeParameters(params)).getOrThrow()
    .map { serializeGeocodeResult(it) }
}

private fun buildGeocodeParameters(params: Map<String, Any?>): GeocodeParameters = GeocodeParameters().apply {
  (params["maxResults"] as? Number)?.toInt()?.let { maxResults = it }
  (params["countryCode"] as? String)?.let { countryCode = it }
  (params["categories"] as? List<*>)?.filterIsInstance<String>()?.let { categories.addAll(it) }
  ((params["preferredSearchLocation"] as? Map<*, *>)?.let { geometryFromDict(it) } as? Point)
    ?.let { preferredSearchLocation = it }
}

private fun buildReverseGeocodeParameters(params: Map<String, Any?>): ReverseGeocodeParameters =
  ReverseGeocodeParameters().apply {
    (params["maxResults"] as? Number)?.toInt()?.let { maxResults = it }
    (params["maxDistance"] as? Number)?.toDouble()?.let { maxDistance = it }
  }

internal suspend fun suggest(searchText: String, params: Map<String, Any?>): List<Map<String, Any?>> =
  locatorTask(params).suggest(searchText, buildSuggestParameters(params)).getOrThrow()
    .map { serializeSuggestResult(it) }

private fun buildSuggestParameters(params: Map<String, Any?>): SuggestParameters = SuggestParameters().apply {
  (params["maxResults"] as? Number)?.toInt()?.let { maxResults = it }
  (params["categories"] as? List<*>)?.filterIsInstance<String>()?.let { categories.addAll(it) }
  ((params["preferredSearchLocation"] as? Map<*, *>)?.let { geometryFromDict(it) } as? Point)
    ?.let { preferredSearchLocation = it }
}

internal fun serializeSuggestResult(result: SuggestResult): Map<String, Any?> =
  mapOf("label" to result.label, "isCollection" to result.isCollection)

internal fun serializeGeocodeResult(result: GeocodeResult): Map<String, Any?> = mapOf(
  "label" to result.label,
  "location" to result.displayLocation?.let { dictFromGeometry(it) },
  "score" to result.score,
  "attributes" to serializeAttributes(result.attributes),
)
