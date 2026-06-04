package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.arcgismaps.mapping.view.MapView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MapLoadedEventPayload(@Field val spatialReferenceWkid: Int? = null) : Record
class MapLoadErrorEventPayload(@Field val message: String = "") : Record

/** Declarative 2D map host. Renders the [ArcGISMapRef] passed as the `map` view prop. */
class ExpoArcgisMapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onMapLoaded by EventDispatcher<MapLoadedEventPayload>()
  private val onMapLoadError by EventDispatcher<MapLoadErrorEventPayload>()

  private val mapView = MapView(context).also {
    it.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    addView(it)
  }

  private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
  private var loadJob: Job? = null
  private var observedLifecycle: Lifecycle? = null

  /** Receives the native map (by reference) from the `<Map>` SharedObject. */
  fun setMap(ref: ArcGISMapRef?) {
    val map = ref?.map ?: return
    mapView.map = map

    loadJob?.cancel()
    loadJob = scope.launch {
      map.load()
        .onSuccess { onMapLoaded(MapLoadedEventPayload()) }
        .onFailure { error ->
          onMapLoadError(MapLoadErrorEventPayload(error.message ?: "Failed to load map"))
        }
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // The view-based MapView renders only while observing a lifecycle.
    val lifecycle = findViewTreeLifecycleOwner()?.lifecycle
    if (lifecycle != null && lifecycle !== observedLifecycle) {
      observedLifecycle?.removeObserver(mapView)
      lifecycle.addObserver(mapView)
      observedLifecycle = lifecycle
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    loadJob?.cancel()
    observedLifecycle?.removeObserver(mapView)
    observedLifecycle = null
  }
}
