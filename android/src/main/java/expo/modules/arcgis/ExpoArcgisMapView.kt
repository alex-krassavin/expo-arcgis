package expo.modules.arcgis

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.Polyline
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.location.Location
import com.arcgismaps.location.LocationDataSource
import com.arcgismaps.location.LocationDisplayAutoPanMode
import com.arcgismaps.location.SimulatedLocationDataSource
import com.arcgismaps.location.SimulationParameters
import com.arcgismaps.location.SystemLocationDataSource
import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.mapping.TimeExtent
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.view.GraphicsOverlay
import com.arcgismaps.mapping.view.Grid
import com.arcgismaps.mapping.view.ImageOverlay
import com.arcgismaps.mapping.view.InsetsViewpointAdjustmentType
import com.arcgismaps.mapping.view.LocationDisplay
import com.arcgismaps.mapping.view.ScreenCoordinate
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditor
import com.arcgismaps.toolkit.geoviewcompose.MapView
import com.arcgismaps.toolkit.geoviewcompose.MapViewProxy
import com.arcgismaps.toolkit.geoviewcompose.ViewpointPersistence
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.viewevent.EventDispatcher
import java.time.Instant
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
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

/**
 * Declarative 2D map host. Renders the [MapRef] passed as the `map` view prop in the ArcGIS Toolkit's
 * composable MapView — the counterpart of the SwiftUI `MapView` the iOS host renders. The props
 * become Compose state; operations that need the drawn view go through its [MapViewProxy].
 */
class ExpoArcgisMapView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private val onMapLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onMapLoadError by EventDispatcher<MapLoadErrorEventPayload>()
  private val onTap by EventDispatcher<TapEventPayload>()
  private val onLocationChange by EventDispatcher<LocationEventPayload>()

  private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
  private var loadJob: Job? = null

  /** Identify, viewpoint animations: everything that needs the drawn MapView. */
  private val proxy = MapViewProxy()
  /** The view's live state for its accessories (expo-arcgis-toolkit's compass…). */
  private val viewState = GeoViewState(proxy)
  /** The view's device-location display; `locationDisplay` configures it. */
  private val locationDisplay = LocationDisplay()

  // What the MapView renders — one state per prop. The overlay lists are `shown…`: a property named
  // like its prop setter would clash with it on the JVM (the same erased `set…(List)` signature).
  private var map by mutableStateOf<ArcGISMap?>(null)
  private var shownGraphicsOverlays by mutableStateOf<List<GraphicsOverlay>>(emptyList())
  private var shownImageOverlays by mutableStateOf<List<ImageOverlay>>(emptyList())
  private var geometryEditor by mutableStateOf<GeometryEditor?>(null)
  private var grid by mutableStateOf<Grid?>(null)
  private var insets by mutableStateOf(PaddingValues(0.dp))
  private var insetsAdjustment by mutableStateOf<InsetsViewpointAdjustmentType>(InsetsViewpointAdjustmentType.NoAdjustment)
  private var timeExtent by mutableStateOf<TimeExtent?>(null)
  /** The last viewpoint from JS. Animated to once the MapView is composed: the prop can come first. */
  private var requestedViewpoint by mutableStateOf<Viewpoint?>(null)
  /** UI other packages draw over the map (expo-arcgis-toolkit's compass…). */
  private var shownAccessories by mutableStateOf<List<GeoViewAccessory>>(emptyList())

  /**
   * Centre of the last reported viewpoint, for `getCenter()`. Read from the viewpoint, like iOS, so
   * it accounts for `contentInsets`. Not Compose state: it changes on every frame of a pan.
   */
  private var currentCenter: Point? = null

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** The view's React children, above the map (see [ReactChildrenLayer]). */
  internal val reactChildren = ReactChildrenLayer(context).also { addView(it) }

  @Composable
  private fun Content() {
    val map = map ?: return
    Box(Modifier.fillMaxSize()) {
      MapContent(map)
      GeoViewAccessories(shownAccessories, insets, viewState)
    }
    LaunchedEffect(requestedViewpoint) {
      requestedViewpoint?.let { proxy.setViewpointAnimated(it, 0.5.seconds) }
    }
  }

  @Composable
  private fun MapContent(map: ArcGISMap) {
    MapView(
      arcGISMap = map,
      modifier = Modifier.fillMaxSize(),
      // Like the view-based MapView: the viewpoint is the map's or the app's, never a saved one.
      viewpointPersistence = ViewpointPersistence.None,
      graphicsOverlays = shownGraphicsOverlays,
      imageOverlays = shownImageOverlays,
      locationDisplay = locationDisplay,
      geometryEditor = geometryEditor,
      mapViewProxy = proxy,
      insets = insets,
      insetsViewpointAdjustment = insetsAdjustment,
      grid = grid,
      timeExtent = timeExtent,
      onViewpointChangedForCenterAndScale = {
        currentCenter = it.targetGeometry as? Point
        viewState.viewpoint = it
      },
      onMapRotationChanged = { viewState.rotation = it },
      onUnitsPerDipChanged = { viewState.unitsPerDip = it },
      onSpatialReferenceChanged = { viewState.spatialReference = it },
      onVisibleAreaChanged = { viewState.visibleArea = it },
      onSingleTapConfirmed = { event ->
        // A 2D tap resolves to the map in practice, but report nothing rather than a fabricated
        // (0, 0) on the off chance it does not. Matches iOS and the SceneView.
        event.mapPoint?.let { mapPoint ->
          val wgs84 = GeometryEngine.projectOrNull(mapPoint, SpatialReference.wgs84()) as? Point ?: mapPoint
          onTap(
            TapEventPayload(
              mapPoint = PointRecord(wgs84.y, wgs84.x),
              screenPoint = ScreenPointRecord(event.screenCoordinate.x, event.screenCoordinate.y)
            )
          )
        }
      },
    )
  }

  init {
    // Emit a location event on each device-location update.
    scope.launch {
      locationDisplay.location.collect { location ->
        location?.let { onLocationChange(locationPayload(it)) }
      }
    }
  }

  /** Receives the accessories other packages declare as `<MapView>` children (expo-arcgis-toolkit). */
  fun setAccessories(refs: List<SharedObject>) {
    shownAccessories = refs.filterIsInstance<GeoViewAccessory>()
  }

  /** Receives the native map (by reference) from the `<Map>` SharedObject. */
  fun setMap(ref: MapRef?) {
    ref ?: return
    applyMap(ref.map)
    // The map may be replaced asynchronously (e.g. once a mobile map package loads) — re-apply then.
    ref.onMapChanged = { newMap -> applyMap(newMap) }
  }

  private fun applyMap(newMap: ArcGISMap) {
    map = newMap
    viewState.map = newMap
    loadJob?.cancel()
    loadJob = scope.launch {
      newMap.load()
        .onSuccess { onMapLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onMapLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load map"))
        }
    }
  }

  /** Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<MapView>`. */
  fun setGraphicsOverlays(refs: List<GraphicsOverlayRef>) {
    shownGraphicsOverlays = refs.map { it.overlay }
  }

  fun setImageOverlays(refs: List<ImageOverlayRef>) {
    shownImageOverlays = refs.map { it.overlay }
  }

  /** Animates the view to a runtime viewpoint sent from JS. */
  fun setViewpoint(vp: Map<String, Any?>?) {
    vp ?: return
    val lat = (vp["latitude"] as? Number)?.toDouble() ?: return
    val lon = (vp["longitude"] as? Number)?.toDouble() ?: return
    val scale = (vp["scale"] as? Number)?.toDouble() ?: return
    requestedViewpoint = Viewpoint(lat, lon, scale)
  }

  /** Sets the coordinate grid overlay from JS (null hides it). */
  fun setGrid(config: Map<String, Any?>?) {
    grid = buildGrid(config)
  }

  /**
   * Reserves space at the view's edges for UI drawn over the map. The map keeps drawing
   * full-bleed; attribution and the location symbol move inside the inset area and viewpoint
   * framing targets it.
   */
  fun setContentInsets(config: Map<String, Any?>?) {
    fun edge(key: String) = ((config?.get(key) as? Number)?.toFloat() ?: 0f).dp
    // Absolute: `left` stays left in a right-to-left layout, as with the view-based MapView.
    insets = PaddingValues.Absolute(edge("left"), edge("top"), edge("right"), edge("bottom"))
  }

  /** How the viewpoint reacts when the insets change (ArcGIS 300.1). */
  fun setInsetsViewpointAdjustment(value: String?) {
    insetsAdjustment = if (value == "preserve-center") {
      InsetsViewpointAdjustmentType.PreserveCenter
    } else {
      InsetsViewpointAdjustmentType.NoAdjustment
    }
  }

  /** Filters time-aware layers to a time window from JS (null shows all time steps). */
  fun setTimeExtent(config: Map<String, Any?>?) {
    if (config == null) { timeExtent = null; return }
    val startMs = (config["startTime"] as? Number)?.toLong() ?: return
    val endMs = (config["endTime"] as? Number)?.toLong() ?: return
    timeExtent = TimeExtent(Instant.ofEpochMilli(startMs), Instant.ofEpochMilli(endMs))
  }

  /** Enables/configures the device location display from JS (null disables it). */
  fun setLocationDisplay(config: Map<String, Any?>?) {
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
    return if (locationDisplay.dataSource is SimulatedLocationDataSource) SystemLocationDataSource() else null
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
    geometryEditor = ref?.editor
  }

  /** Identifies the features under a screen point (one result per layer with hits). */
  fun identify(screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise) {
    val x = (screenPoint["x"] as? Number)?.toDouble() ?: 0.0
    val y = (screenPoint["y"] as? Number)?.toDouble() ?: 0.0
    val tolerance = (options?.get("tolerance") as? Number)?.toFloat() ?: 12f
    val maxResults = (options?.get("maxResults") as? Number)?.toInt() ?: 1
    scope.launch {
      proxy.identifyLayers(ScreenCoordinate(x, y), tolerance.dp, false, maxResults)
        .onSuccess { results -> promise.resolve(results.map { serializeIdentifyResult(it) }) }
        .onFailure { promise.reject("IDENTIFY_ERROR", it.message ?: "Identify failed", it) }
    }
  }

  /** The geographic centre of the visible map (WGS84), or null before the view has drawn. */
  fun getCenter(promise: Promise) {
    val center = currentCenter ?: run { promise.resolve(null); return }
    val wgs84 = GeometryEngine.projectOrNull(center, SpatialReference.wgs84()) as? Point ?: center
    promise.resolve(mapOf("latitude" to wgs84.y, "longitude" to wgs84.x))
  }

  /** Identifies popups under a screen point — evaluates each and returns `{ title, fields }`. */
  fun identifyPopups(screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise) {
    val x = (screenPoint["x"] as? Number)?.toDouble() ?: 0.0
    val y = (screenPoint["y"] as? Number)?.toDouble() ?: 0.0
    val tolerance = (options?.get("tolerance") as? Number)?.toFloat() ?: 12f
    val maxResults = (options?.get("maxResults") as? Number)?.toInt() ?: 1
    scope.launch {
      try {
        val results = proxy.identifyLayers(ScreenCoordinate(x, y), tolerance.dp, false, maxResults).getOrThrow()
        promise.resolve(serializePopups(results))
      } catch (e: Exception) {
        promise.reject("IDENTIFY_ERROR", e.message ?: "Identify failed", e)
      }
    }
  }

  /** Retries loading the map (Loadable pattern) — useful after a network outage. Re-emits the result. */
  fun retryLoad(promise: Promise) {
    val map = map ?: run { promise.resolve(null); return }
    scope.launch {
      map.retryLoad()
        .onSuccess { onMapLoaded(MapLoadedEventPayload()); promise.resolve(null) }
        .onFailure { error ->
          onMapLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load map"))
          promise.resolve(null)
        }
    }
  }

  /** Returns the names of the displayed map's bookmarks (e.g. those saved in a loaded web map). */
  fun getBookmarkNames(promise: Promise) {
    val map = map ?: run { promise.resolve(emptyList<String>()); return }
    scope.launch {
      map.load()
        .onSuccess { promise.resolve(map.bookmarks.map { it.name }) }
        .onFailure { e -> promise.reject("BOOKMARK_ERROR", e.message ?: "Failed to load map", e) }
    }
  }

  /** Navigates to the named bookmark's viewpoint; resolves whether a matching bookmark was found. */
  fun setBookmark(name: String, promise: Promise) {
    val map = map ?: run { promise.resolve(false); return }
    scope.launch {
      try {
        map.load().getOrThrow()
        val viewpoint = map.bookmarks.firstOrNull { it.name == name }?.viewpoint
          ?: run { promise.resolve(false); return@launch }
        proxy.setViewpointAnimated(viewpoint, 0.5.seconds)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("BOOKMARK_ERROR", e.message ?: "Failed", e)
      }
    }
  }

  /**
   * Releases the view for good once React unmounts it (Expo's OnViewDestroys). A detach is not
   * enough to go on: react-native-screens also detaches screens it is about to show again.
   *
   * Disposing the composition destroys the GeoView — the SDK frees its render thread and GPU
   * surface only then — and cancelling the scope lets go of the view. The ComposeView is removed
   * too: the screen can stay attached through its exit animation, and a ComposeView measured after
   * `disposeComposition()` composes its content again — a second map for a screen that is leaving.
   */
  fun destroy() {
    scope.cancel()
    composeView.disposeComposition()
    removeView(composeView)
  }
}

/** Maps the JS auto-pan union to the native [LocationDisplayAutoPanMode]. */
private fun autoPanMode(mode: String?): LocationDisplayAutoPanMode = when (mode) {
  "recenter" -> LocationDisplayAutoPanMode.Recenter
  "navigation" -> LocationDisplayAutoPanMode.Navigation
  "compassNavigation" -> LocationDisplayAutoPanMode.CompassNavigation
  else -> LocationDisplayAutoPanMode.Off
}

/// Builds an ArcGIS coordinate grid from a JS config (`{ type, visible? }`); null = no grid.
/// Shared by `ExpoArcgisMapView` and `ExpoArcgisSceneView`.
internal fun buildGrid(config: Map<String, Any?>?): com.arcgismaps.mapping.view.Grid? {
  val type = config?.get("type") as? String ?: return null
  val grid: com.arcgismaps.mapping.view.Grid = when (type) {
    "mgrs" -> com.arcgismaps.mapping.view.MgrsGrid()
    "utm" -> com.arcgismaps.mapping.view.UtmGrid()
    "usng" -> com.arcgismaps.mapping.view.UsngGrid()
    else -> com.arcgismaps.mapping.view.LatitudeLongitudeGrid()
  }
  (config["visible"] as? Boolean)?.let { grid.isVisible = it }
  return grid
}
