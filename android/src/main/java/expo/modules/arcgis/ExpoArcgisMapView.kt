package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.geometry.Polyline
import com.arcgismaps.location.Location
import com.arcgismaps.location.LocationDataSource
import com.arcgismaps.location.LocationDisplayAutoPanMode
import com.arcgismaps.location.SimulatedLocationDataSource
import com.arcgismaps.location.SimulationParameters
import com.arcgismaps.location.SystemLocationDataSource
import java.time.Instant
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.view.MapView
import com.arcgismaps.mapping.view.ScreenCoordinate
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MapLoadedEventPayload(@Field val spatialReferenceWkid: Int? = null) : Record
class MapLoadErrorEventPayload(@Field val message: String = "") : Record

class PointRecord(
  @Field val latitude: Double = 0.0,
  @Field val longitude: Double = 0.0,
) : Record

class ScreenPointRecord(
  @Field val x: Double = 0.0,
  @Field val y: Double = 0.0,
) : Record

class TapEventPayload(
  @Field val mapPoint: PointRecord = PointRecord(),
  @Field val screenPoint: ScreenPointRecord = ScreenPointRecord(),
) : Record

class LocationPositionRecord(
  @Field val latitude: Double = 0.0,
  @Field val longitude: Double = 0.0,
  @Field val z: Double? = null,
) : Record

class LocationEventPayload(
  @Field val position: LocationPositionRecord = LocationPositionRecord(),
  @Field val horizontalAccuracy: Double = 0.0,
  @Field val verticalAccuracy: Double = 0.0,
  @Field val course: Double = 0.0,
  @Field val speed: Double = 0.0,
  @Field val timestamp: Double = 0.0,
) : Record

/** Declarative 2D map host. Renders the [MapRef] passed as the `map` view prop. */
class ExpoArcgisMapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMapLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onMapLoadError by EventDispatcher<MapLoadErrorEventPayload>()
  private val onTap by EventDispatcher<TapEventPayload>()
  private val onLocationChange by EventDispatcher<LocationEventPayload>()

  private val mapView = MapView(context).also {
    it.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    addView(it)
  }

  private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
  private var loadJob: Job? = null
  private var observedLifecycle: Lifecycle? = null

  init {
    // Emit tap events with the map location (projected to WGS84).
    scope.launch {
      mapView.onSingleTapConfirmed.collect { event ->
        val wgs84 = event.mapPoint?.let {
          GeometryEngine.projectOrNull(it, SpatialReference.wgs84()) as? Point
        }
        onTap(
          TapEventPayload(
            mapPoint = PointRecord(wgs84?.y ?: 0.0, wgs84?.x ?: 0.0),
            screenPoint = ScreenPointRecord(event.screenCoordinate.x, event.screenCoordinate.y)
          )
        )
      }
    }
    // Emit a location event on each device-location update.
    scope.launch {
      mapView.locationDisplay.location.collect { location ->
        location?.let { onLocationChange(locationPayload(it)) }
      }
    }
  }

  /** Receives the native map (by reference) from the `<Map>` SharedObject. */
  fun setMap(ref: MapRef?) {
    ref ?: return
    applyMap(ref.map)
    // The map may be replaced asynchronously (e.g. once a mobile map package loads) — re-apply then.
    ref.onMapChanged = { newMap -> applyMap(newMap) }
  }

  private fun applyMap(map: com.arcgismaps.mapping.ArcGISMap) {
    mapView.map = map
    loadJob?.cancel()
    loadJob = scope.launch {
      map.load()
        .onSuccess { onMapLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onMapLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load map"))
        }
    }
  }

  /** Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<MapView>`. */
  fun setGraphicsOverlays(refs: List<GraphicsOverlayRef>) {
    mapView.graphicsOverlays.clear()
    mapView.graphicsOverlays.addAll(refs.map { it.overlay })
  }

  /** Animates the view to a runtime viewpoint sent from JS. */
  fun setViewpoint(vp: Map<String, Any?>?) {
    vp ?: return
    val lat = (vp["latitude"] as? Number)?.toDouble() ?: return
    val lon = (vp["longitude"] as? Number)?.toDouble() ?: return
    val scale = (vp["scale"] as? Number)?.toDouble() ?: return
    scope.launch { mapView.setViewpointAnimated(Viewpoint(lat, lon, scale), 0.5f) }
  }

  /** Enables/configures the device location display from JS (null disables it). */
  fun setLocationDisplay(config: Map<String, Any?>?) {
    val locationDisplay = mapView.locationDisplay
    if (config == null) {
      scope.launch { locationDisplay.dataSource.stop() }
      return
    }
    locationDisplay.setAutoPanMode(autoPanMode(config["autoPanMode"] as? String))
    (config["showLocation"] as? Boolean)?.let { locationDisplay.showLocation = it }
    (config["wanderExtentFactor"] as? Number)?.toFloat()?.let { locationDisplay.wanderExtentFactor = it }
    val newSource = locationDataSource(config["source"])
    scope.launch {
      locationDisplay.dataSource.stop()
      if (newSource != null) locationDisplay.dataSource = newSource
      locationDisplay.dataSource.start()
    }
  }

  /** Resolves the JS `source` to a data source. Returns null to keep the current source unchanged. */
  private fun locationDataSource(source: Any?): LocationDataSource? {
    if (source is Map<*, *> && source["type"] == "simulated") {
      val route = (source["route"] as? Map<*, *>)?.let { geometryFromDict(it) } as? Polyline ?: return null
      val speed = (source["speed"] as? Number)?.toDouble() ?: 10.0
      return SimulatedLocationDataSource(route, SimulationParameters(Instant.now(), speed, 0.0, 0.0))
    }
    // 'system' / unspecified: swap back only if currently simulated, otherwise keep the source.
    return if (mapView.locationDisplay.dataSource is SimulatedLocationDataSource) SystemLocationDataSource() else null
  }

  private fun locationPayload(location: Location): LocationEventPayload = LocationEventPayload(
    position = LocationPositionRecord(location.position.y, location.position.x, location.position.z),
    horizontalAccuracy = location.horizontalAccuracy,
    verticalAccuracy = location.verticalAccuracy,
    course = location.course,
    speed = location.speed,
    timestamp = location.timestamp.toEpochMilli().toDouble(),
  )

  /** Binds an interactive GeometryEditor for sketching (null clears it). */
  fun setGeometryEditor(ref: GeometryEditorRef?) {
    mapView.geometryEditor = ref?.editor
  }

  /** Identifies the features under a screen point (one result per layer with hits). */
  fun identify(screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise) {
    val x = (screenPoint["x"] as? Number)?.toDouble() ?: 0.0
    val y = (screenPoint["y"] as? Number)?.toDouble() ?: 0.0
    val tolerance = (options?.get("tolerance") as? Number)?.toDouble() ?: 12.0
    val maxResults = (options?.get("maxResults") as? Number)?.toInt() ?: 1
    scope.launch {
      mapView.identifyLayers(ScreenCoordinate(x, y), tolerance, false, maxResults)
        .onSuccess { results -> promise.resolve(results.map { serializeIdentifyResult(it) }) }
        .onFailure { promise.reject("IDENTIFY_ERROR", it.message ?: "Identify failed", it) }
    }
  }

  /** Retries loading the map (Loadable pattern) — useful after a network outage. Re-emits the result. */
  fun retryLoad(promise: Promise) {
    val map = mapView.map ?: run { promise.resolve(null); return }
    scope.launch {
      map.retryLoad()
        .onSuccess { onMapLoaded(MapLoadedEventPayload()); promise.resolve(null) }
        .onFailure { error ->
          onMapLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load map"))
          promise.resolve(null)
        }
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // The view-based MapView renders only while observing a lifecycle.
    val lifecycle = findViewTreeLifecycleOwner()?.lifecycle
    if (lifecycle != null && lifecycle !== observedLifecycle) {
      observedLifecycle?.removeObserver(mapView)
      lifecycle.addObserver(mapView)
      observedLifecycle = lifecycle
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    loadJob?.cancel()
    observedLifecycle?.removeObserver(mapView)
    observedLifecycle = null
  }
}

/** Maps the JS auto-pan union to the native [LocationDisplayAutoPanMode]. */
private fun autoPanMode(mode: String?): LocationDisplayAutoPanMode = when (mode) {
  "recenter" -> LocationDisplayAutoPanMode.Recenter
  "navigation" -> LocationDisplayAutoPanMode.Navigation
  "compassNavigation" -> LocationDisplayAutoPanMode.CompassNavigation
  else -> LocationDisplayAutoPanMode.Off
}
