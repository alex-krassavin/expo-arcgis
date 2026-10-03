package expo.modules.arcgis

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.TimeExtent
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.view.AnalysisOverlay
import com.arcgismaps.mapping.view.AttributionBarLayoutChangeEvent
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.mapping.view.GraphicsOverlay
import com.arcgismaps.mapping.view.IdentifyLayerResult
import com.arcgismaps.mapping.view.LightingMode
import com.arcgismaps.mapping.view.LocationToScreenResult
import com.arcgismaps.mapping.view.ScreenCoordinate
import com.arcgismaps.mapping.view.SingleTapConfirmedEvent
import com.arcgismaps.toolkit.geoviewcompose.SceneViewProxy
import java.time.Instant

/**
 * Shows a `<SceneView>`'s scene in a composable of a package built on expo-arcgis, in place of the
 * Toolkit's SceneView: expo-arcgis-toolkit's augmented reality views. The Kotlin Toolkit's
 * TableTopSceneView, FlyoverSceneView and WorldScaleSceneView take the SceneView's parameters,
 * which the container receives as [SceneViewParameters].
 *
 * The `<SceneView>` receives the container (a shared object) as its `container` prop. The core
 * still loads the scene and reports the view's events; the container decides how the scene shows,
 * and controls the camera. A view with a container shows no accessories and no `<Callout>`.
 */
interface SceneViewContainer {
  /** What the core asks of the drawn view (identify, screen projections), through its proxy. */
  val operations: SceneViewOperations

  @Composable
  fun Content(parameters: SceneViewParameters)
}

/**
 * What the core asks of a drawn scene view. The Toolkit's SceneViewProxy and its AR views'
 * proxies all have these.
 */
interface SceneViewOperations {
  suspend fun identifyLayers(
    screenCoordinate: ScreenCoordinate,
    tolerance: Dp,
    returnPopupsOnly: Boolean,
    maximumResults: Int?,
  ): Result<List<IdentifyLayerResult>>

  suspend fun screenToLocation(screenCoordinate: ScreenCoordinate): Result<Point>

  fun locationToScreen(scenePoint: Point): LocationToScreenResult?
}

/** The parameters the core passes to the Toolkit's SceneView, for a container to pass on. */
class SceneViewParameters(
  val arcGISScene: ArcGISScene,
  val graphicsOverlays: List<GraphicsOverlay>,
  val analysisOverlays: List<AnalysisOverlay>,
  val timeExtent: TimeExtent?,
  val sunTime: Instant,
  val sunLighting: LightingMode,
  val onCurrentViewpointCameraChanged: (Camera) -> Unit,
  val onViewpointChangedForCenterAndScale: (Viewpoint) -> Unit,
  val onSpatialReferenceChanged: (SpatialReference?) -> Unit,
  val onNavigationChanged: (Boolean) -> Unit,
  val onAttributionBarLayoutChanged: (AttributionBarLayoutChangeEvent) -> Unit,
  val onSingleTapConfirmed: (SingleTapConfirmedEvent) -> Unit,
)

/** The Toolkit's SceneView, through its proxy. */
internal class SceneViewProxyOperations(private val proxy: SceneViewProxy) : SceneViewOperations {
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
