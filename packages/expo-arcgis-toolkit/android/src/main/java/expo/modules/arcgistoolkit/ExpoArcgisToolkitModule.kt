package expo.modules.arcgistoolkit

import android.content.Context
import android.view.ViewGroup
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.ComposeView
import com.arcgismaps.toolkit.basemapgallery.BasemapGallery
import com.arcgismaps.toolkit.compass.Compass
import com.arcgismaps.toolkit.geoviewcompose.MapView
import com.arcgismaps.toolkit.geoviewcompose.MapViewProxy
import expo.modules.arcgis.MapRef
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView

// SPIKE — build-compatibility probe, replaced by the real components. It compiles, on each Expo
// SDK the harness covers:
// - toolkit composables (Compass, BasemapGallery) hosted in an Expo view;
// - geoview-compose's MapView + MapViewProxy, the candidate replacement for the core's Android
//   MapView;
// - a core shared object (MapRef) resolved from another module.
class ExpoArcgisToolkitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArcgisToolkit")

    View(ToolkitProbeView::class) {
      Prop("map") { view: ToolkitProbeView, ref: MapRef? ->
        view.setMap(ref)
      }
    }
  }
}

class ToolkitProbeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private var mapRef: MapRef? = null

  private val composeView = ComposeView(context).also {
    it.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    addView(it)
  }

  fun setMap(ref: MapRef?) {
    mapRef = ref
    val map = ref?.map ?: return
    composeView.setContent {
      val proxy = remember { MapViewProxy() }
      Column {
        Compass(rotation = 0.0)
        BasemapGallery(basemapGalleryItems = emptyList(), onItemClick = {})
        MapView(arcGISMap = map, mapViewProxy = proxy)
      }
    }
  }
}
