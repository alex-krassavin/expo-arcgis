package expo.modules.arcgis

import com.arcgismaps.tasks.networkanalysis.ServiceAreaFacility
import com.arcgismaps.tasks.networkanalysis.ServiceAreaPolygon
import com.arcgismaps.tasks.networkanalysis.ServiceAreaResult
import com.arcgismaps.tasks.networkanalysis.ServiceAreaTask
import com.arcgismaps.geometry.Point
import java.util.concurrent.ConcurrentHashMap

/**
 * Free functions backing the JS `serviceArea` namespace — computing reachable areas from
 * facilities via a [ServiceAreaTask]. Registered as an `AsyncFunction` in
 * `ExpoArcgisGeometryModule`.
 */

/** Caches one [ServiceAreaTask] per service URL so repeated solves don't reload service metadata. */
private val serviceAreaTasks = ConcurrentHashMap<String, ServiceAreaTask>()

private fun serviceAreaTask(url: String): ServiceAreaTask =
  serviceAreaTasks.getOrPut(url) { ServiceAreaTask(url) }

internal suspend fun serviceAreaSolve(params: Map<String, Any?>): Map<String, Any?> {
  val serviceUrl = params["serviceUrl"] as? String
    ?: error("serviceUrl is required")
  val task = serviceAreaTask(serviceUrl)
  // createDefaultParameters() loads the task so the service metadata is populated afterwards.
  val parameters = task.createDefaultParameters().getOrThrow()
  val facilitiesDicts = params["facilities"] as? List<*> ?: emptyList<Any?>()
  parameters.setFacilities(buildFacilities(facilitiesDicts))
  (params["cutoffs"] as? List<*>)?.let { rawCutoffs ->
    val cutoffs = rawCutoffs.mapNotNull { (it as? Number)?.toDouble() }
    if (cutoffs.isNotEmpty()) {
      // ServiceAreaParameters.defaultImpedanceCutoffs is a mutable live list (no setter / add API).
      parameters.defaultImpedanceCutoffs.clear()
      parameters.defaultImpedanceCutoffs.addAll(cutoffs)
    }
  }
  val result = task.solveServiceArea(parameters).getOrThrow()
  return serializeServiceAreaResult(result)
}

private fun buildFacilities(dicts: List<*>): List<ServiceAreaFacility> =
  dicts.filterIsInstance<Map<*, *>>().mapNotNull { dict ->
    (geometryFromDict(dict) as? Point)?.let { ServiceAreaFacility(it) }
  }

private fun serializeServiceAreaResult(result: ServiceAreaResult): Map<String, Any?> {
  val polygons = mutableListOf<Map<String, Any?>>()
  for ((index, _) in result.facilities.withIndex()) {
    for (polygon in result.getResultPolygons(index)) {
      polygons.add(serializeServiceAreaPolygon(polygon))
    }
  }
  return mapOf("polygons" to polygons)
}

private fun serializeServiceAreaPolygon(polygon: ServiceAreaPolygon): Map<String, Any?> = mapOf(
  "geometry" to dictFromGeometry(polygon.geometry),
  "fromCutoff" to polygon.fromImpedanceCutoff,
  "toCutoff" to polygon.toImpedanceCutoff,
)
