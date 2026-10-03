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
import com.arcgismaps.toolkit.ar.TableTopSceneView
import com.arcgismaps.toolkit.ar.TableTopSceneViewProxy
import com.arcgismaps.toolkit.ar.TableTopSceneViewStatus
import expo.modules.arcgis.SceneViewContainer
import expo.modules.arcgis.SceneViewOperations
import expo.modules.arcgis.SceneViewParameters
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * The Toolkit's `TableTopSceneView` for a `<SceneView>`: the scene sits on a physical surface, such
 * as a table, that the user taps once ARCore has detected it.
 */
class TableTopContainer(appContext: AppContext) : SharedObject(appContext), SceneViewContainer {
  private var anchorPoint by mutableStateOf<Point?>(null)
  private var translationFactor by mutableStateOf(1.0)
  private var clippingDistance by mutableStateOf<Double?>(null)
  private var requestCameraPermissionAutomatically by mutableStateOf(true)

  private val proxy = TableTopSceneViewProxy()

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

  /**
   * Applies the JS props: `anchorPoint`, `translationFactor`, `clippingDistance`,
   * `requestCameraPermissionAutomatically`.
   */
  fun update(props: Map<String, Any?>) {
    anchorPoint = arLocation(props["anchorPoint"])
    translationFactor = double(props["translationFactor"]) ?: 1.0
    clippingDistance = double(props["clippingDistance"])
    requestCameraPermissionAutomatically = props["requestCameraPermissionAutomatically"] as? Boolean ?: true
  }

  @Composable
  override fun Content(parameters: SceneViewParameters) {
    val anchorPoint = anchorPoint ?: return
    TableTopSceneView(
      arcGISScene = parameters.arcGISScene,
      arcGISSceneAnchor = anchorPoint,
      translationFactor = translationFactor,
      modifier = Modifier.fillMaxSize(),
      clippingDistance = clippingDistance,
      onInitializationStatusChanged = { status ->
        emit("onInitializationStatusChange", when (status) {
          is TableTopSceneViewStatus.Initializing -> statusPayload("initializing")
          is TableTopSceneViewStatus.DetectingPlanes -> statusPayload("detectingPlanes")
          is TableTopSceneViewStatus.Initialized -> statusPayload("initialized")
          is TableTopSceneViewStatus.FailedToInitialize -> statusPayload("failedToInitialize", status.error)
        })
      },
      requestCameraPermissionAutomatically = requestCameraPermissionAutomatically,
      onViewpointChangedForCenterAndScale = parameters.onViewpointChangedForCenterAndScale,
      graphicsOverlays = parameters.graphicsOverlays,
      tableTopSceneViewProxy = proxy,
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
