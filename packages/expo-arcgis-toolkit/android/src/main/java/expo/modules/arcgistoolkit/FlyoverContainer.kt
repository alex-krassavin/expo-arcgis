package expo.modules.arcgistoolkit

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.arcgismaps.geometry.Point
import com.arcgismaps.mapping.view.ScreenCoordinate
import com.arcgismaps.toolkit.ar.FlyoverSceneView
import com.arcgismaps.toolkit.ar.FlyoverSceneViewProxy
import com.arcgismaps.toolkit.ar.FlyoverSceneViewStatus
import expo.modules.arcgis.SceneViewContainer
import expo.modules.arcgis.SceneViewOperations
import expo.modules.arcgis.SceneViewParameters
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * The Toolkit's `FlyoverSceneView` for a `<SceneView>`: as the device moves, the camera flies over
 * the scene from its initial location. It tracks the device's position with ARCore, without
 * showing the camera feed.
 */
class FlyoverContainer(appContext: AppContext) : SharedObject(appContext), SceneViewContainer {
  /** The proxy carries the camera's origin: the Kotlin Toolkit sets the initial location on it. */
  private var proxy by mutableStateOf<FlyoverSceneViewProxy?>(null)
  private var translationFactor by mutableStateOf(1.0)

  /** The initial location and heading last set, as JS gave them. */
  private var origin: Pair<Map<*, *>, Double>? = null

  override val operations = object : SceneViewOperations {
    override suspend fun identifyLayers(
      screenCoordinate: ScreenCoordinate,
      tolerance: Dp,
      returnPopupsOnly: Boolean,
      maximumResults: Int?,
    ) = proxy?.identifyLayers(screenCoordinate, tolerance, returnPopupsOnly, maximumResults)
      ?: Result.success(emptyList())

    override suspend fun screenToLocation(screenCoordinate: ScreenCoordinate) =
      proxy?.screenToLocation(screenCoordinate)
        ?: Result.failure(IllegalStateException("The flyover scene view isn't drawn"))

    override fun locationToScreen(scenePoint: Point) = proxy?.locationToScreen(scenePoint)
  }

  /**
   * Applies the JS props: `initialLocation`, `initialHeading` (0 when unset: the Kotlin Toolkit has
   * no compass heading), `translationFactor`.
   */
  fun update(props: Map<String, Any?>) {
    translationFactor = double(props["translationFactor"]) ?: 1.0
    val location = props["initialLocation"] as? Map<*, *>
    val heading = double(props["initialHeading"]) ?: 0.0
    val point = arLocation(location) ?: return
    if (origin == location!! to heading) return
    origin = location to heading
    // A new origin resets the AR session, as the Toolkit's setLocationAndHeading does.
    proxy?.setLocationAndHeading(point, heading) ?: run { proxy = FlyoverSceneViewProxy(point, heading) }
  }

  @Composable
  override fun Content(parameters: SceneViewParameters) {
    val proxy = proxy ?: return
    FlyoverSceneView(
      arcGISScene = parameters.arcGISScene,
      flyoverSceneViewProxy = proxy,
      translationFactor = translationFactor,
      modifier = Modifier.fillMaxSize(),
      onInitializationStatusChanged = { status ->
        emit("onInitializationStatusChange", when (status) {
          is FlyoverSceneViewStatus.Initializing -> statusPayload("initializing")
          is FlyoverSceneViewStatus.Initialized -> statusPayload("initialized")
          is FlyoverSceneViewStatus.FailedToInitialize -> statusPayload("failedToInitialize", status.error)
        })
      },
      onViewpointChangedForCenterAndScale = parameters.onViewpointChangedForCenterAndScale,
      graphicsOverlays = parameters.graphicsOverlays,
      onAttributionBarLayoutChanged = parameters.onAttributionBarLayoutChanged,
      analysisOverlays = parameters.analysisOverlays,
      timeExtent = parameters.timeExtent,
      sunTime = parameters.sunTime,
      sunLighting = parameters.sunLighting,
      onNavigationChanged = parameters.onNavigationChanged,
      onSpatialReferenceChanged = parameters.onSpatialReferenceChanged,
      onCurrentViewpointCameraChanged = parameters.onCurrentViewpointCameraChanged,
      onSingleTapConfirmed = parameters.onSingleTapConfirmed,
    )
  }
}
