package expo.modules.arcgistoolkit

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import com.arcgismaps.geometry.Point
import com.arcgismaps.mapping.view.ScreenCoordinate
import com.arcgismaps.toolkit.ar.WorldScaleSceneView
import com.arcgismaps.toolkit.ar.WorldScaleSceneViewProxy
import com.arcgismaps.toolkit.ar.WorldScaleSceneViewStatus
import com.arcgismaps.toolkit.ar.WorldScaleTrackingMode
import expo.modules.arcgis.SceneViewContainer
import expo.modules.arcgis.SceneViewOperations
import expo.modules.arcgis.SceneViewParameters
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * The Toolkit's `WorldScaleSceneView` for a `<SceneView>`: the scene lines up with the real world
 * around the device, positioned by ARCore and the device's location (or Google's Geospatial API).
 */
class WorldScaleContainer(appContext: AppContext) : SharedObject(appContext), SceneViewContainer {
  /** The Kotlin Toolkit's tracking mode, by name: `World` or `Geospatial`. */
  private var trackingMode by mutableStateOf("world")
  private var clippingDistance by mutableStateOf<Double?>(null)

  private val proxy = WorldScaleSceneViewProxy()

  override val operations = object : SceneViewOperations {
    override suspend fun identifyLayers(
      screenCoordinate: ScreenCoordinate,
      tolerance: Dp,
      returnPopupsOnly: Boolean,
      maximumResults: Int?,
    ) = proxy.identifyLayers(screenCoordinate, tolerance, returnPopupsOnly, maximumResults)

    override suspend fun screenToLocation(screenCoordinate: ScreenCoordinate) =
      proxy.screenToLocation(screenCoordinate)

    override fun locationToScreen(scenePoint: Point) = proxy.locationToScreen(scenePoint)
  }

  /** Applies the JS props: `worldScaleTrackingMode`, `clippingDistance`. */
  fun update(props: Map<String, Any?>) {
    trackingMode = if (props["worldScaleTrackingMode"] == "geospatial") "geospatial" else "world"
    clippingDistance = double(props["clippingDistance"])
  }

  @Composable
  override fun Content(parameters: SceneViewParameters) {
    // A new tracking mode starts a new AR session.
    key(trackingMode) {
      WorldScaleSceneView(
        arcGISScene = parameters.arcGISScene,
        modifier = Modifier.fillMaxSize(),
        worldScaleTrackingMode = if (trackingMode == "geospatial") {
          WorldScaleTrackingMode.Geospatial()
        } else {
          WorldScaleTrackingMode.World()
        },
        clippingDistance = clippingDistance,
        onInitializationStatusChanged = { status ->
          emit("onInitializationStatusChange", when (status) {
            is WorldScaleSceneViewStatus.Initializing -> statusPayload("initializing")
            is WorldScaleSceneViewStatus.Initialized -> statusPayload("initialized")
            is WorldScaleSceneViewStatus.FailedToInitialize -> statusPayload("failedToInitialize", status.error)
          })
        },
        onTrackingErrorChanged = { error ->
          emit("onTrackingErrorChange", mapOf("error" to error?.let { it.message ?: it.toString() }))
        },
        onViewpointChangedForCenterAndScale = parameters.onViewpointChangedForCenterAndScale,
        graphicsOverlays = parameters.graphicsOverlays,
        worldScaleSceneViewProxy = proxy,
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
}
