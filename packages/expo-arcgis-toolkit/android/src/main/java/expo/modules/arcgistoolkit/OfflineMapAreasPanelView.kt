package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.toolkit.offline.OfflineMapAreas
import com.arcgismaps.toolkit.offline.OfflineMapState
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.MapRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.viewevent.EventDispatcher

/**
 * The Toolkit's `OfflineMapAreas` for the nearest `<Map>`'s web map: it downloads its preplanned and
 * on-demand map areas, and opens one as an offline map, which JS gets as a `MapRef` to show in a
 * `<MapView map>`.
 */
class OfflineMapAreasPanelView(context: Context, appContext: AppContext) :
  ComposeHostView(context, appContext) {
  private val onSelectionChange by EventDispatcher<Map<String, Any?>>()

  private var mapRef by mutableStateOf<MapRef?>(null)
  private var state: OfflineMapState? = null
  private var selection: ArcGISMap? = null
  /** The selected offline map's handle, made once per map so that JS keeps one object for it. */
  private var selectedMapRef: MapRef? = null

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** Receives the nearest `<Map>`'s native object: the web map to take offline. */
  fun setGeoModel(ref: SharedObject?) {
    mapRef = ref as? MapRef
  }

  /** The offline map open, by reference; null while the web map is online. */
  fun getSelectedMap(): MapRef? {
    val selection = selection ?: return null
    if (selectedMapRef?.map !== selection) selectedMapRef = MapRef(appContext, selection)
    return selectedMapRef
  }

  /** Goes back to the web map online. */
  fun goOnline() {
    state?.resetSelectedMapArea()
  }

  @Composable
  private fun Content() {
    val ref = mapRef ?: return
    // Follows the map when it is replaced (a mobile map package loads asynchronously).
    val map by ref.mapFlow.collectAsState()
    // One state per web map: it takes its map when it is made.
    val state = remember(map) {
      OfflineMapState(map) { selected ->
        if (selected !== selection) {
          selection = selected
          onSelectionChange(mapOf("isOffline" to (selected != null)))
        }
      }.also { state = it }
    }
    OfflineMapAreas(offlineMapState = state, modifier = Modifier.fillMaxSize())
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}
