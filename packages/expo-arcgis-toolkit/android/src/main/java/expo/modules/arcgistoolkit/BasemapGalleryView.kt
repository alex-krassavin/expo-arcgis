package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.Item
import com.arcgismaps.portal.Portal
import com.arcgismaps.toolkit.basemapgallery.BasemapGallery
import com.arcgismaps.toolkit.basemapgallery.BasemapGalleryItem
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.MapRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * The Toolkit's `BasemapGallery` for the nearest `<Map>`. Its items are ArcGIS Online's developer
 * basemaps, the iOS gallery's default; picking one sets the map's basemap, which the iOS gallery does
 * itself and the Android one leaves to its host.
 */
class BasemapGalleryView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private var mapRef by mutableStateOf<MapRef?>(null)

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** Receives the nearest `<Map>`'s native object. */
  fun setGeoModel(ref: SharedObject?) {
    mapRef = ref as? MapRef
  }

  @Composable
  private fun Content() {
    val ref = mapRef ?: return
    // Follows the map when it is replaced (a mobile map package loads asynchronously).
    val map by ref.mapFlow.collectAsState()
    val items = remember { mutableStateListOf<BasemapGalleryItem>() }
    LaunchedEffect(Unit) {
      Portal("https://www.arcgis.com").fetchDeveloperBasemaps().onSuccess { basemaps ->
        items.addAll(basemaps.mapNotNull { it.item }.map { BasemapGalleryItem(it) })
      }
    }
    BasemapGallery(
      basemapGalleryItems = items,
      onItemClick = { item -> (item.tag as? Item)?.let { map.setBasemap(Basemap(item = it)) } },
    )
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}
