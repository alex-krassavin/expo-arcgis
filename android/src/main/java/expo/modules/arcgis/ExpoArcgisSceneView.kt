package expo.modules.arcgis

import android.content.Context
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
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.TimeExtent
import com.arcgismaps.mapping.view.AnalysisOverlay
import com.arcgismaps.mapping.view.AtmosphereEffect
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.mapping.view.CameraController
import com.arcgismaps.mapping.view.GlobeCameraController
import com.arcgismaps.mapping.view.GraphicsOverlay
import com.arcgismaps.mapping.view.Grid
import com.arcgismaps.mapping.view.LightingMode
import com.arcgismaps.mapping.view.OrbitGeoElementCameraController
import com.arcgismaps.mapping.view.OrbitLocationCameraController
import com.arcgismaps.mapping.view.SceneLocationVisibility
import com.arcgismaps.mapping.view.ScreenCoordinate
import com.arcgismaps.toolkit.geoviewcompose.SceneView
import com.arcgismaps.toolkit.geoviewcompose.SceneViewDefaults
import com.arcgismaps.toolkit.geoviewcompose.SceneViewProxy
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.time.Instant
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Declarative 3D scene host. Renders the [SceneRef] passed as the `scene` view prop in the ArcGIS
 * Toolkit's composable SceneView — the counterpart of the SwiftUI `SceneView` the iOS host renders.
 * The props become Compose state; operations that need the drawn view go through its [SceneViewProxy].
 */
class ExpoArcgisSceneView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onSceneLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onSceneLoadError by EventDispatcher<MapLoadErrorEventPayload>()
  private val onTap by EventDispatcher<TapEventPayload>()

  private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
  private var loadJob: Job? = null

  /** Identify, camera animations, screen projections: everything that needs the drawn SceneView. */
  private val proxy = SceneViewProxy()

  // What the SceneView renders — one state per prop.
  private var scene by mutableStateOf<ArcGISScene?>(null)
  private var graphicsOverlays by mutableStateOf<List<GraphicsOverlay>>(emptyList())
  private var analysisOverlays by mutableStateOf<List<AnalysisOverlay>>(emptyList())
  private var cameraController by mutableStateOf<CameraController>(GlobeCameraController())
  private var grid by mutableStateOf<Grid?>(null)
  private var sunLighting by mutableStateOf(LightingMode.NoLight)
  private var atmosphereEffect by mutableStateOf(AtmosphereEffect.HorizonOnly)
  private var sunTime by mutableStateOf(SceneViewDefaults.DefaultSunTime)
  private var timeExtent by mutableStateOf<TimeExtent?>(null)
  /** The last camera from JS. Animated to once the SceneView is composed: the prop can come first. */
  private var requestedCamera by mutableStateOf<Camera?>(null)

  /** The camera as last reported, for `getCamera()`. Not Compose state: it changes every frame. */
  private var currentCamera: Camera? = null

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  @Composable
  private fun Content() {
    val scene = scene ?: return
    SceneView(
      arcGISScene = scene,
      modifier = Modifier.fillMaxSize(),
      graphicsOverlays = graphicsOverlays,
      sceneViewProxy = proxy,
      grid = grid,
      cameraController = cameraController,
      analysisOverlays = analysisOverlays,
      atmosphereEffect = atmosphereEffect,
      timeExtent = timeExtent,
      sunTime = sunTime,
      sunLighting = sunLighting,
      onCurrentViewpointCameraChanged = { currentCamera = it },
      onSingleTapConfirmed = { event ->
        scope.launch {
          // `mapPoint` is frequently null on a SceneView — a 3D tap can miss the globe entirely, and
          // the event does not resolve taps that land on scene content. `screenToLocation` accounts
          // for both the base surface and scene content, so try it before giving up.
          val scenePoint = event.mapPoint
            ?: proxy.screenToLocation(event.screenCoordinate).getOrNull()
            // Report nothing rather than a fabricated (0, 0), which a caller cannot tell apart from
            // a genuine tap in the Gulf of Guinea. Matches iOS, which skips the event on a miss.
            ?: return@launch
          val wgs84 = GeometryEngine.projectOrNull(scenePoint, SpatialReference.wgs84()) as? Point ?: scenePoint
          onTap(
            TapEventPayload(
              mapPoint = PointRecord(wgs84.y, wgs84.x),
              screenPoint = ScreenPointRecord(event.screenCoordinate.x, event.screenCoordinate.y)
            )
          )
        }
      },
    )
    LaunchedEffect(requestedCamera) {
      requestedCamera?.let { proxy.setViewpointCameraAnimated(it, 0.5.seconds) }
    }
  }

  /** Receives the native scene (by reference) from the `<Scene>` SharedObject. */
  fun setScene(ref: SceneRef?) {
    ref ?: return
    applyScene(ref.scene)
    // The scene may be replaced asynchronously (e.g. once a mobile scene package loads) — re-apply.
    ref.onSceneChanged = { newScene -> applyScene(newScene) }
  }

  private fun applyScene(newScene: ArcGISScene) {
    scene = newScene
    loadJob?.cancel()
    loadJob = scope.launch {
      newScene.load()
        .onSuccess { onSceneLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onSceneLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load scene"))
        }
    }
  }

  /** Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<SceneView>`. */
  fun setGraphicsOverlays(refs: List<GraphicsOverlayRef>) {
    graphicsOverlays = refs.map { it.overlay }
  }

  /** Receives the analysis overlays declared as `<AnalysisOverlay>` children of the `<SceneView>`. */
  fun setAnalysisOverlays(refs: List<AnalysisOverlayRef>) {
    analysisOverlays = refs.map { it.overlay }
  }

  /** Identifies the features under a screen point (3D). Mirrors `MapView.identify`. */
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

  /** Retries loading the scene (Loadable pattern) — useful after a network outage. Re-emits the result. */
  fun retryLoad(promise: Promise) {
    val scene = scene ?: run { promise.resolve(null); return }
    scope.launch {
      scene.retryLoad()
        .onSuccess { onSceneLoaded(MapLoadedEventPayload()); promise.resolve(null) }
        .onFailure { error ->
          onSceneLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load scene"))
          promise.resolve(null)
        }
    }
  }

  /**
   * The camera as the user has left it, in WGS84 — the same shape the `camera` prop accepts, so a
   * caller can read it, adjust it, and hand it back.
   */
  fun getCamera(): Map<String, Any?>? {
    val camera = currentCamera ?: return null
    val location = (GeometryEngine.projectOrNull(camera.location, SpatialReference.wgs84()) as? Point)
      ?: camera.location
    return mapOf(
      "position" to buildMap {
        put("x", location.x)
        put("y", location.y)
        location.z?.let { put("z", it) }
      },
      "heading" to camera.heading,
      "pitch" to camera.pitch,
      "roll" to camera.roll,
    )
  }

  /**
   * Where a scene location currently falls on screen, in points, plus whether anything is between
   * it and the camera. Null before the view has drawn.
   */
  fun screenPoint(location: Map<String, Any?>): Map<String, Any?>? {
    val point = geometryFromDict(location) as? Point ?: return null
    val result = proxy.locationToScreen(point) ?: return null
    return mapOf(
      "x" to result.screenPoint.x,
      "y" to result.screenPoint.y,
      "visibility" to screenPointVisibility(result.visibility),
    )
  }

  /** Returns the terrain elevation (meters) at a point on the scene's base surface, or null. */
  fun getElevation(point: Map<String, Any?>, promise: Promise) {
    val scene = scene ?: run { promise.resolve(null); return }
    val p = geometryFromDict(point) as? Point ?: run { promise.resolve(null); return }
    scope.launch {
      scene.baseSurface.getElevation(p)
        .onSuccess { promise.resolve(it) }
        .onFailure { e -> promise.reject("ELEVATION_ERROR", e.message ?: "Elevation query failed", e) }
    }
  }

  /** Animates the view to a runtime camera sent from JS. */
  fun setCamera(c: Map<String, Any?>?) {
    val position = c?.get("position") as? Map<*, *> ?: return
    val x = (position["x"] as? Number)?.toDouble() ?: 0.0
    val y = (position["y"] as? Number)?.toDouble() ?: 0.0
    val z = (position["z"] as? Number)?.toDouble()
    val point = if (z != null) Point(x, y, z, SpatialReference.wgs84())
    else Point(x, y, SpatialReference.wgs84())
    requestedCamera = Camera(
      point,
      (c["heading"] as? Number)?.toDouble() ?: 0.0,
      (c["pitch"] as? Number)?.toDouble() ?: 0.0,
      (c["roll"] as? Number)?.toDouble() ?: 0.0,
    )
  }

  /** Sets or clears the scene's camera controller (orbit/globe). `null` restores the SDK default. */
  private var cameraControllerConfig: Map<String, Any?>? = null
  private var orbitGraphic: GraphicRef? = null

  fun setCameraController(c: Map<String, Any?>?) {
    cameraControllerConfig = c
    rebuildCameraController()
  }

  /** Stores the target graphic for an `orbitGeoElement` camera controller and rebuilds. */
  fun setOrbitGraphic(ref: GraphicRef?) {
    orbitGraphic = ref
    rebuildCameraController()
  }

  private fun rebuildCameraController() {
    val c = cameraControllerConfig
    cameraController = when (c?.get("type") as? String) {
      "orbitLocation" -> {
        val target = c["target"] as? Map<*, *>
        val x = (target?.get("x") as? Number)?.toDouble() ?: 0.0
        val y = (target?.get("y") as? Number)?.toDouble() ?: 0.0
        val z = (target?.get("z") as? Number)?.toDouble()
        val point = if (z != null) Point(x, y, z, SpatialReference.wgs84())
                    else Point(x, y, SpatialReference.wgs84())
        val distance = (c["distance"] as? Number)?.toDouble() ?: 1500.0
        OrbitLocationCameraController(point, distance)
      }
      "orbitGeoElement" -> {
        val graphic = orbitGraphic
        if (graphic != null) {
          val distance = (c["distance"] as? Number)?.toDouble() ?: 1500.0
          OrbitGeoElementCameraController(graphic.graphic, distance)
        } else GlobeCameraController()
      }
      "globe" -> GlobeCameraController()
      else -> GlobeCameraController() // null/absent → restore SDK default (GlobeCameraController)
    }
  }

  /** Sets the coordinate grid overlay from JS (null hides it). */
  fun setGrid(config: Map<String, Any?>?) {
    grid = buildGrid(config)
  }

  /** Sun lighting mode (shadows). */
  fun setSunLighting(s: String?) {
    sunLighting = when (s) {
      "light" -> LightingMode.Light
      "lightAndShadows" -> LightingMode.LightAndShadows
      else -> LightingMode.NoLight
    }
  }

  /** Atmosphere rendering. */
  fun setAtmosphereEffect(s: String?) {
    atmosphereEffect = when (s) {
      "off" -> AtmosphereEffect.None
      "realistic" -> AtmosphereEffect.Realistic
      else -> AtmosphereEffect.HorizonOnly
    }
  }

  /** Sun position, as epoch milliseconds (affects shadow direction). */
  fun setSunTime(ms: Double?) {
    ms ?: return
    sunTime = Instant.ofEpochMilli(ms.toLong())
  }

  /** Filters time-aware layers to a time window from JS (null shows all time steps). */
  fun setTimeExtent(config: Map<String, Any?>?) {
    if (config == null) { timeExtent = null; return }
    val startMs = (config["startTime"] as? Number)?.toLong() ?: return
    val endMs = (config["endTime"] as? Number)?.toLong() ?: return
    timeExtent = TimeExtent(Instant.ofEpochMilli(startMs), Instant.ofEpochMilli(endMs))
  }

  /** Releases the view for good once React unmounts it — see [ExpoArcgisMapView.destroy]. */
  fun destroy() {
    scope.cancel()
    composeView.disposeComposition()
  }
}

/** Maps [SceneLocationVisibility] to the kebab-case strings the JS side uses. */
private fun screenPointVisibility(visibility: SceneLocationVisibility): String = when (visibility) {
  SceneLocationVisibility.Visible -> "visible"
  SceneLocationVisibility.HiddenByBaseSurface -> "hidden-by-base-surface"
  SceneLocationVisibility.HiddenByEarth -> "hidden-by-earth"
  SceneLocationVisibility.HiddenByElevation -> "hidden-by-elevation"
  SceneLocationVisibility.NotOnScreen -> "not-on-screen"
}
