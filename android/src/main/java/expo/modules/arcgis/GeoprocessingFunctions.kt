package expo.modules.arcgis

import com.arcgismaps.data.FeatureCollectionTable
import com.arcgismaps.mapping.view.Graphic
import com.arcgismaps.tasks.geoprocessing.GeoprocessingTask
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingBoolean
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingDouble
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingFeatures
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingLinearUnit
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingLong
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingParameter
import com.arcgismaps.tasks.geoprocessing.geoprocessingparameters.GeoprocessingString
import java.util.concurrent.ConcurrentHashMap

/**
 * Free functions backing the JS `geoprocessor` namespace — runs a geoprocessing service via a
 * [GeoprocessingTask]. Registered as an `AsyncFunction` in `ExpoArcgisGeometryModule`.
 */

/** Caches one [GeoprocessingTask] per service URL so repeated runs don't reload service metadata. */
private val geoprocessingTasks = ConcurrentHashMap<String, GeoprocessingTask>()

private fun geoprocessingTask(url: String): GeoprocessingTask =
  geoprocessingTasks.getOrPut(url) { GeoprocessingTask(url) }

internal suspend fun executeGeoprocessing(
  serviceUrl: String,
  inputs: Map<String, Any?>,
): Map<String, Any?> {
  val task = geoprocessingTask(serviceUrl)
  // createDefaultParameters() loads the task and sets the service's execution type (sync / async).
  val parameters = task.createDefaultParameters().getOrThrow()
  inputs.forEach { (name, raw) ->
    (raw as? Map<*, *>)?.let { buildGeoprocessingParameter(it) }?.let { parameters.inputs[name] = it }
  }
  val job = task.createJob(parameters)
  job.start()
  val result = job.result().getOrThrow()
  return mapOf("outputs" to serializeOutputs(result.outputs))
}

private fun buildGeoprocessingParameter(d: Map<*, *>): GeoprocessingParameter? = when (d["type"]) {
  "string" -> GeoprocessingString(d["value"] as? String ?: "")
  "double" -> GeoprocessingDouble((d["value"] as? Number)?.toDouble() ?: 0.0)
  "long" -> GeoprocessingLong((d["value"] as? Number)?.toInt() ?: 0)
  "boolean" -> GeoprocessingBoolean(d["value"] as? Boolean ?: false)
  "linearUnit" -> GeoprocessingLinearUnit(
    (d["value"] as? Number)?.toDouble() ?: 0.0,
    linearUnit(d["unit"] as? String),
  )
  "features" -> {
    val graphics = (d["geometries"] as? List<*>)
      ?.mapNotNull { (it as? Map<*, *>)?.let { m -> geometryFromDict(m) } }
      ?.map { Graphic().apply { geometry = it } } ?: emptyList()
    GeoprocessingFeatures(FeatureCollectionTable(graphics, emptyList()))
  }
  else -> null
}

private suspend fun serializeOutputs(outputs: Map<String, GeoprocessingParameter>): Map<String, Any?> {
  val result = mutableMapOf<String, Any?>()
  for ((name, param) in outputs) result[name] = serializeGeoprocessingParameter(param)
  return result
}

private suspend fun serializeGeoprocessingParameter(param: GeoprocessingParameter): Any? = when (param) {
  is GeoprocessingString -> param.value
  is GeoprocessingDouble -> param.value
  is GeoprocessingLong -> param.value
  is GeoprocessingBoolean -> param.value
  is GeoprocessingLinearUnit -> param.distance
  is GeoprocessingFeatures -> {
    if (param.canFetchOutputFeatures) param.fetchOutputFeatures().getOrThrow()
    param.features?.map { serializeFeature(it) } ?: emptyList<Map<String, Any?>>()
  }
  else -> null
}
