package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.TimeExtent
import com.arcgismaps.mapping.view.AtmosphereEffect
import java.time.Instant
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.mapping.view.GlobeCameraController
import com.arcgismaps.mapping.view.LightingMode
import com.arcgismaps.mapping.view.OrbitLocationCameraController
import com.arcgismaps.mapping.view.SceneView
import com.arcgismaps.mapping.view.ScreenCoordinate
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** Declarative 3D scene host. Renders the [SceneRef] passed as the `scene` view prop. */
class ExpoArcgisSceneView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onSceneLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onSceneLoadError by EventDispatcher<MapLoadErrorEventPayload>()
  private val onTap by EventDispatcher<TapEventPayload>()

  private val sceneView = SceneView(context).also {
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
    scope.launch {
      sceneView.onSingleTapConfirmed.collect { event ->
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
  }

  /** Receives the native scene (by reference) from the `<Scene>` SharedObject. */
  fun setScene(ref: SceneRef?) {
    ref ?: return
    applyScene(ref.scene)
    // The scene may be replaced asynchronously (e.g. once a mobile scene package loads) — re-apply.
    ref.onSceneChanged = { newScene -> applyScene(newScene) }
  }

  private fun applyScene(scene: com.arcgismaps.mapping.ArcGISScene) {
    sceneView.scene = scene
    loadJob?.cancel()
    loadJob = scope.launch {
      scene.load()
        .onSuccess { onSceneLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onSceneLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load scene"))
        }
    }
  }

  /** Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<SceneView>`. */
  fun setGraphicsOverlays(refs: List<GraphicsOverlayRef>) {
    sceneView.graphicsOverlays.clear()
    sceneView.graphicsOverlays.addAll(refs.map { it.overlay })
  }

  /** Receives the analysis overlays declared as `<AnalysisOverlay>` children of the `<SceneView>`. */
  fun setAnalysisOverlays(refs: List<AnalysisOverlayRef>) {
    sceneView.analysisOverlays.clear()
    sceneView.analysisOverlays.addAll(refs.map { it.overlay })
  }

  /** Identifies the features under a screen point (3D). Mirrors `MapView.identify`. */
  fun identify(screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise) {
    val x = (screenPoint["x"] as? Number)?.toDouble() ?: 0.0
    val y = (screenPoint["y"] as? Number)?.toDouble() ?: 0.0
    val tolerance = (options?.get("tolerance") as? Number)?.toDouble() ?: 12.0
    val maxResults = (options?.get("maxResults") as? Number)?.toInt() ?: 1
    scope.launch {
      sceneView.identifyLayers(ScreenCoordinate(x, y), tolerance, false, maxResults)
        .onSuccess { results -> promise.resolve(results.map { serializeIdentifyResult(it) }) }
        .onFailure { promise.reject("IDENTIFY_ERROR", it.message ?: "Identify failed", it) }
    }
  }

  /** Identifies popups under a screen point — evaluates each and returns `{ title, fields }`. */
  fun identifyPopups(screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise) {
    val x = (screenPoint["x"] as? Number)?.toDouble() ?: 0.0
    val y = (screenPoint["y"] as? Number)?.toDouble() ?: 0.0
    val tolerance = (options?.get("tolerance") as? Number)?.toDouble() ?: 12.0
    val maxResults = (options?.get("maxResults") as? Number)?.toInt() ?: 1
    scope.launch {
      try {
        val results = sceneView.identifyLayers(ScreenCoordinate(x, y), tolerance, false, maxResults).getOrThrow()
        promise.resolve(serializePopups(results))
      } catch (e: Exception) {
        promise.reject("IDENTIFY_ERROR", e.message ?: "Identify failed", e)
      }
    }
  }

  /** Retries loading the scene (Loadable pattern) — useful after a network outage. Re-emits the result. */
  fun retryLoad(promise: Promise) {
    val scene = sceneView.scene ?: run { promise.resolve(null); return }
    scope.launch {
      scene.retryLoad()
        .onSuccess { onSceneLoaded(MapLoadedEventPayload()); promise.resolve(null) }
        .onFailure { error ->
          onSceneLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load scene"))
          promise.resolve(null)
        }
    }
  }

  /** Returns the terrain elevation (meters) at a point on the scene's base surface, or null. */
  fun getElevation(point: Map<String, Any?>, promise: Promise) {
    val scene = sceneView.scene ?: run { promise.resolve(null); return }
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
    val camera = Camera(
      point,
      (c["heading"] as? Number)?.toDouble() ?: 0.0,
      (c["pitch"] as? Number)?.toDouble() ?: 0.0,
      (c["roll"] as? Number)?.toDouble() ?: 0.0,
    )
    scope.launch { sceneView.setViewpointCameraAnimated(camera, 0.5f) }
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
    sceneView.cameraController = when (c?.get("type") as? String) {
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
          com.arcgismaps.mapping.view.OrbitGeoElementCameraController(graphic.graphic, distance)
        } else GlobeCameraController()
      }
      "globe" -> GlobeCameraController()
      else -> GlobeCameraController() // null/absent → restore SDK default (GlobeCameraController)
    }
  }

  /** Sets the coordinate grid overlay from JS (null hides it). */
  fun setGrid(config: Map<String, Any?>?) {
    sceneView.grid = buildGrid(config)
      ?: com.arcgismaps.mapping.view.LatitudeLongitudeGrid().apply { isVisible = false }
  }

  /** Sun lighting mode (shadows). */
  fun setSunLighting(s: String?) {
    sceneView.sunLighting = when (s) {
      "light" -> LightingMode.Light
      "lightAndShadows" -> LightingMode.LightAndShadows
      else -> LightingMode.NoLight
    }
  }

  /** Atmosphere rendering. */
  fun setAtmosphereEffect(s: String?) {
    sceneView.atmosphereEffect = when (s) {
      "off" -> AtmosphereEffect.None
      "realistic" -> AtmosphereEffect.Realistic
      else -> AtmosphereEffect.HorizonOnly
    }
  }

  /** Sun position, as epoch milliseconds (affects shadow direction). */
  fun setSunTime(ms: Double?) {
    ms ?: return
    sceneView.sunTime = java.time.Instant.ofEpochMilli(ms.toLong())
  }

  /** Filters time-aware layers to a time window from JS (null shows all time steps). */
  fun setTimeExtent(config: Map<String, Any?>?) {
    if (config == null) { sceneView.setTimeExtent(null); return }
    val startMs = (config["startTime"] as? Number)?.toLong() ?: return
    val endMs = (config["endTime"] as? Number)?.toLong() ?: return
    sceneView.setTimeExtent(TimeExtent(Instant.ofEpochMilli(startMs), Instant.ofEpochMilli(endMs)))
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    val lifecycle = findViewTreeLifecycleOwner()?.lifecycle
    if (lifecycle != null && lifecycle !== observedLifecycle) {
      observedLifecycle?.removeObserver(sceneView)
      lifecycle.addObserver(sceneView)
      observedLifecycle = lifecycle
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    loadJob?.cancel()
    observedLifecycle?.removeObserver(sceneView)
    observedLifecycle = null
  }
}
