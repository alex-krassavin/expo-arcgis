package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.view.GraphicsOverlay
import com.arcgismaps.toolkit.utilitynetworks.Trace
import com.arcgismaps.toolkit.utilitynetworks.TraceState
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.GeoViewRef
import expo.modules.arcgis.GraphicsOverlayRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext

/**
 * The Toolkit's `Trace` for a `<MapView>` whose web map has utility networks: it runs their named
 * trace configurations from starting points the user taps on the map, and draws them and the
 * results into the overlay the app gives it.
 */
class UtilityNetworkTraceView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private var geoViewRef by mutableStateOf<GeoViewRef?>(null)
  private var overlay by mutableStateOf<GraphicsOverlay?>(null)
  private var tappedPoint by mutableStateOf<Point?>(null)

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** Receives the view the trace is for (expo-arcgis's GeoViewRef). */
  fun setGeoView(ref: GeoViewRef?) {
    geoViewRef = ref
  }

  /** Receives the overlay the app declared for the trace (expo-arcgis's GraphicsOverlayRef). */
  fun setGraphicsOverlay(ref: GraphicsOverlayRef?) {
    overlay = ref?.overlay
  }

  /** Receives where the user tapped the map: `{ latitude, longitude }`. */
  fun setMapPoint(value: Map<String, Any?>?) {
    val latitude = (value?.get("latitude") as? Number)?.toDouble()
    val longitude = (value?.get("longitude") as? Number)?.toDouble()
    tappedPoint = if (latitude != null && longitude != null) {
      Point(longitude, latitude, SpatialReference.wgs84())
    } else {
      null
    }
  }

  @Composable
  private fun Content() {
    val view = geoViewRef?.state ?: return
    val map = view.map ?: return
    val overlay = overlay ?: return
    // The trace state takes the map and overlay when it is made: a new one when they change.
    val state = remember(map, overlay) { TraceState(map, overlay, view.mapViewProxy) }
    // A tap adds starting points there while the trace is adding them, as the Toolkit's example
    // wires the map view's taps.
    LaunchedEffect(state, tappedPoint) {
      tappedPoint?.let { state.addStartingPoint(it) }
    }
    Trace(traceState = state, modifier = Modifier.fillMaxSize())
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}
