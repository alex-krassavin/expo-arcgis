package expo.modules.arcgis

import com.arcgismaps.geometry.Point
import com.arcgismaps.tasks.networkanalysis.Route
import com.arcgismaps.tasks.networkanalysis.RouteParameters
import com.arcgismaps.tasks.networkanalysis.RouteResult
import com.arcgismaps.tasks.networkanalysis.RouteTask
import com.arcgismaps.tasks.networkanalysis.Stop
import java.util.concurrent.ConcurrentHashMap

/**
 * Free functions backing the JS `router` namespace — routing between stops via a [RouteTask].
 * Registered as an `AsyncFunction` in `ExpoArcgisGeometryModule`.
 */

private const val WORLD_ROUTE =
  "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World"

/** Caches one [RouteTask] per service URL so repeated solves don't reload service metadata. */
private val routeTasks = ConcurrentHashMap<String, RouteTask>()

private fun routeTask(params: Map<String, Any?>): RouteTask {
  val url = params["routeServiceUrl"] as? String ?: WORLD_ROUTE
  return routeTasks.getOrPut(url) { RouteTask(url) }
}

internal suspend fun solveRoute(
  stops: List<Map<String, Any?>>,
  params: Map<String, Any?>,
): Map<String, Any?> {
  val task = routeTask(params)
  // createDefaultParameters() loads the task, so `task.routeTaskInfo` is populated afterwards.
  val parameters = task.createDefaultParameters().getOrThrow()
  applyRouteParameters(parameters, params, task)
  parameters.setStops(buildStops(stops))
  val result = task.solveRoute(parameters).getOrThrow()
  return serializeRouteResult(result)
}

private fun buildStops(stops: List<Map<String, Any?>>): List<Stop> = stops.mapNotNull { dict ->
  val point = (dict["point"] as? Map<*, *>)?.let { geometryFromDict(it) } as? Point
    ?: return@mapNotNull null
  Stop(point).apply { (dict["name"] as? String)?.let { name = it } }
}

private fun applyRouteParameters(
  parameters: RouteParameters,
  params: Map<String, Any?>,
  task: RouteTask,
) {
  parameters.returnDirections = false
  (params["returnRoutes"] as? Boolean)?.let { parameters.returnRoutes = it }
  (params["returnStops"] as? Boolean)?.let { parameters.returnStops = it }
  (params["findBestSequence"] as? Boolean)?.let { parameters.findBestSequence = it }
  (params["travelMode"] as? String)?.let { name ->
    task.getRouteTaskInfo().travelModes.firstOrNull { it.name == name }?.let { parameters.travelMode = it }
  }
}

private fun serializeRouteResult(result: RouteResult): Map<String, Any?> = mapOf(
  "routes" to result.routes.map { serializeRoute(it) },
  "messages" to result.messages,
)

private fun serializeRoute(route: Route): Map<String, Any?> = mapOf(
  "geometry" to route.routeGeometry?.let { dictFromGeometry(it) },
  "name" to route.routeName,
  "totalLength" to route.totalLength,
  "travelTime" to route.travelTime,
  "totalTime" to route.totalTime,
)
