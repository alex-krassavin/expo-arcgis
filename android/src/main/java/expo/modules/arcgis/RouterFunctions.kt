package expo.modules.arcgis

import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.location.Location
import com.arcgismaps.navigation.RouteTracker
import com.arcgismaps.tasks.networkanalysis.CurbApproach
import com.arcgismaps.tasks.networkanalysis.DirectionManeuver
import com.arcgismaps.tasks.networkanalysis.PointBarrier
import com.arcgismaps.tasks.networkanalysis.Route
import com.arcgismaps.tasks.networkanalysis.RouteParameters
import com.arcgismaps.tasks.networkanalysis.RouteResult
import com.arcgismaps.tasks.networkanalysis.RouteTask
import com.arcgismaps.tasks.networkanalysis.Stop
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
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
  Stop(point).apply {
    (dict["name"] as? String)?.let { name = it }
    curbApproachFromString(dict["curbApproach"] as? String)?.let { curbApproach = it }
  }
}

/** Builds point barriers (locations the route must avoid) from JS point geometries. */
private fun buildPointBarriers(barriers: List<*>): List<PointBarrier> =
  barriers.filterIsInstance<Map<*, *>>().mapNotNull { geometryFromDict(it) as? Point }.map { PointBarrier(it) }

/** Maps the JS curb-approach union to the native [CurbApproach]. */
private fun curbApproachFromString(s: String?): CurbApproach? = when (s) {
  "eitherSide" -> CurbApproach.EitherSide
  "leftSide" -> CurbApproach.LeftSide
  "rightSide" -> CurbApproach.RightSide
  "noUTurn" -> CurbApproach.NoUTurn
  else -> null
}

private fun applyRouteParameters(
  parameters: RouteParameters,
  params: Map<String, Any?>,
  task: RouteTask,
) {
  parameters.returnDirections = params["returnDirections"] as? Boolean ?: true
  (params["directionsLanguage"] as? String)?.let { parameters.directionsLanguage = it }
  (params["returnRoutes"] as? Boolean)?.let { parameters.returnRoutes = it }
  (params["returnStops"] as? Boolean)?.let { parameters.returnStops = it }
  (params["findBestSequence"] as? Boolean)?.let { parameters.findBestSequence = it }
  (params["barriers"] as? List<*>)?.let { parameters.setPointBarriers(buildPointBarriers(it)) }
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
  "directions" to route.directionManeuvers.map { serializeManeuver(it) },
)

private fun serializeManeuver(maneuver: DirectionManeuver): Map<String, Any?> = mapOf(
  "text" to maneuver.directionText,
  "length" to maneuver.length,
  "duration" to maneuver.duration,
  "geometry" to maneuver.geometry?.let { dictFromGeometry(it) },
)

// region Route tracking (turn-by-turn navigation)

/**
 * SharedObject wrapping a [RouteTracker]. Feed it device locations (e.g. from `onLocationChange`)
 * via [trackLocation]; each call advances navigation and returns the current tracking status.
 */
class RouteTrackerRef(appContext: AppContext, private val tracker: RouteTracker) :
  SharedObject(appContext) {
  suspend fun trackLocation(loc: Map<String, Any?>): Map<String, Any?> {
    val lat = (loc["latitude"] as? Number)?.toDouble() ?: return emptyMap()
    val lon = (loc["longitude"] as? Number)?.toDouble() ?: return emptyMap()
    val point = Point(lon, lat, SpatialReference.wgs84())
    val location = Location.create(
      point, 0.0, 0.0,
      (loc["speed"] as? Number)?.toDouble() ?: 0.0,
      (loc["course"] as? Number)?.toDouble() ?: 0.0,
      false, java.time.Instant.now(), emptyMap(),
    )
    tracker.trackLocation(location).getOrThrow()
    return serializeTrackingStatus(tracker)
  }

  suspend fun switchToNextDestination() {
    tracker.switchToNextDestination().getOrThrow()
  }
}

private fun serializeTrackingStatus(tracker: RouteTracker): Map<String, Any?> {
  val status = tracker.trackingStatus.value ?: return emptyMap()
  val voice = tracker.generateVoiceGuidance()
  return mapOf(
    "distanceRemaining" to status.routeProgress.remainingDistance.distance,
    "timeRemaining" to status.routeProgress.remainingTime,
    "currentManeuverIndex" to status.currentManeuverIndex,
    "remainingDestinationCount" to status.remainingDestinationCount,
    "destinationStatus" to status.destinationStatus.toString(),
    "voiceText" to (voice?.text ?: ""),
  )
}

/** Solves a route from [stops] and returns a [RouteTrackerRef] for turn-by-turn navigation. */
internal suspend fun createRouteTracker(
  appContext: AppContext,
  stops: List<Map<String, Any?>>,
  params: Map<String, Any?>,
): RouteTrackerRef {
  val task = routeTask(params)
  val parameters = task.createDefaultParameters().getOrThrow()
  applyRouteParameters(parameters, params, task)
  parameters.setStops(buildStops(stops))
  parameters.returnDirections = true
  val result = task.solveRoute(parameters).getOrThrow()
  val tracker = RouteTracker(result, 0, false)
  return RouteTrackerRef(appContext, tracker)
}
