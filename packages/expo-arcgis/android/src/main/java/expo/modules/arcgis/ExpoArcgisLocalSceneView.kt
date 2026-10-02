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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.arcgismaps.geometry.GeometryEngine
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.toolkit.geoviewcompose.LocalSceneView
import com.arcgismaps.toolkit.geoviewcompose.LocalSceneViewProxy
import com.arcgismaps.toolkit.geoviewcompose.MapViewProxy
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Declarative local 3D scene host: the Toolkit's composable LocalSceneView, for a scene whose
 * viewing mode is local (a local web scene, or `<Scene viewingMode="local">`). Renders the
 * [SceneRef] passed as the `scene` view prop, as [ExpoArcgisSceneView] does for a global scene.
 */
class ExpoArcgisLocalSceneView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private val onSceneLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onSceneLoadError by EventDispatcher<MapLoadErrorEventPayload>()
  private val onTap by EventDispatcher<TapEventPayload>()

  private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
  private var loadJob: Job? = null

  /** Camera animations, screen projections: everything that needs the drawn LocalSceneView. */
  private val proxy = LocalSceneViewProxy()

  private var scene by mutableStateOf<ArcGISScene?>(null)
  /** The last camera from JS. Animated to once the view is composed: the prop can come first. */
  private var requestedCamera by mutableStateOf<Camera?>(null)

  /** The camera as last reported, for `getCamera()`. Not Compose state: it changes every frame. */
  private var currentCamera: Camera? = null

  /** The view's live state for its accessories and panels (expo-arcgis-toolkit). */
  private val viewState = GeoViewState(MapViewProxy(), localSceneViewProxy = proxy)

  /** The UI other packages draw over the scene. */
  private var shownAccessories by mutableStateOf<List<GeoViewAccessory>>(emptyList())

  /** The view's [GeoViewRef], which carries its state to the views of packages built on expo-arcgis. */
  private var geoViewRef: GeoViewRef? = null

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** The view's React children, above the scene (see [ReactChildrenLayer]). */
  internal val reactChildren = ReactChildrenLayer(context).also { addView(it) }

  @Composable
  private fun Content() {
    val scene = scene ?: return
    Box(Modifier.fillMaxSize()) {
      SceneContent(scene)
      GeoViewAccessories(shownAccessories, PaddingValues(0.dp), viewState)
    }
    LaunchedEffect(requestedCamera) {
      requestedCamera?.let { proxy.setViewpointCameraAnimated(it, 0.5.seconds) }
    }
  }

  @Composable
  private fun SceneContent(scene: ArcGISScene) {
    val density = LocalDensity.current
    LocalSceneView(
      scene = scene,
      modifier = Modifier.fillMaxSize(),
      localSceneViewProxy = proxy,
      onCurrentViewpointCameraChanged = {
        currentCamera = it
        viewState.camera = it
      },
      onViewpointChangedForCenterAndScale = {
        viewState.viewpoint = it
        viewState.rotation = it.rotation
      },
      onSpatialReferenceChanged = { viewState.spatialReference = it },
      onNavigationChanged = { viewState.isNavigating = it },
      onAttributionBarLayoutChanged = { event ->
        viewState.attributionBarHeight = with(density) { (event.bottom - event.top).toDp() }
      },
      onSingleTapConfirmed = { event ->
        scope.launch {
          // A 3D tap can miss the scene, and the event doesn't resolve taps on scene content:
          // `screenToLocation` covers both. Report nothing on a miss, as on iOS.
          val scenePoint = event.mapPoint
            ?: proxy.screenToLocation(event.screenCoordinate).getOrNull()
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
    viewState.scene = newScene
    loadJob?.cancel()
    loadJob = scope.launch {
      newScene.load()
        .onSuccess { onSceneLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onSceneLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load scene"))
        }
    }
  }

  /** Retries loading the scene (Loadable pattern). Re-emits the result. */
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

  /** The camera as the user has left it, in WGS84 — the shape the `camera` prop accepts. */
  fun getCamera(): Map<String, Any?>? {
    val camera = currentCamera ?: return null
    val location = GeometryEngine.projectOrNull(camera.location, SpatialReference.wgs84()) as? Point
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

  /** Animates the view to a camera sent from JS. */
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

  /** Receives the accessories other packages declare as `<LocalSceneView>` children. */
  fun setAccessories(refs: List<SharedObject>) {
    shownAccessories = refs.filterIsInstance<GeoViewAccessory>()
  }

  fun setGeoViewRef(ref: GeoViewRef?) {
    if (ref === geoViewRef) return
    geoViewRef?.state = null
    geoViewRef = ref
    ref?.state = viewState
  }

  /** Releases the view for good once React unmounts it — see [ExpoArcgisMapView.destroy]. */
  fun destroy() {
    geoViewRef?.state = null
    scope.cancel()
    composeView.disposeComposition()
    removeView(composeView)
  }
}
