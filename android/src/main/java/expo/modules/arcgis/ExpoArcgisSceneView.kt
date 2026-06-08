package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.view.AtmosphereEffect
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.mapping.view.LightingMode
import com.arcgismaps.mapping.view.SceneView
import expo.modules.kotlin.AppContext
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
    val scene = ref?.scene ?: return
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
