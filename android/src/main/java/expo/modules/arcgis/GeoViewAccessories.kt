package expo.modules.arcgis

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.arcgismaps.geometry.Polygon
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.toolkit.geoviewcompose.MapViewProxy

/**
 * UI that a package built on expo-arcgis draws over a `<MapView>`: the ArcGIS Toolkit's compass,
 * scalebar… (expo-arcgis-toolkit). The package's shared object implements this; JS hands it to the
 * view (`GeoViewHost.addAccessory`), and the view composes it over the map at [alignment], inside the
 * view's `contentInsets`.
 */
interface GeoViewAccessory {
  /** Where in the view the accessory sits. */
  val alignment: Alignment

  /** The accessory's content, with the view's live state. */
  @Composable
  fun Content(view: GeoViewState)
}

/**
 * The live state of a `<MapView>`, for its accessories. Compose state, so an accessory that reads it
 * recomposes when it changes — and nothing else does: the map doesn't read it.
 */
class GeoViewState internal constructor(
  /** Operations on the map view (viewpoint animations, identify…). */
  val mapViewProxy: MapViewProxy
) {
  /** The map the view shows. */
  var map by mutableStateOf<ArcGISMap?>(null)
    internal set

  /** The view's viewpoint, by center and scale. */
  var viewpoint by mutableStateOf<Viewpoint?>(null)
    internal set

  /** The map's rotation, in degrees. */
  var rotation by mutableDoubleStateOf(0.0)
    internal set

  /** Map units per density-independent pixel at the view's center. */
  var unitsPerDip by mutableDoubleStateOf(Double.NaN)
    internal set

  var spatialReference by mutableStateOf<SpatialReference?>(null)
    internal set

  var visibleArea by mutableStateOf<Polygon?>(null)
    internal set
}

/** Composes a map view's accessories over it, each at its alignment. */
@Composable
internal fun GeoViewAccessories(
  accessories: List<GeoViewAccessory>,
  insets: PaddingValues,
  state: GeoViewState,
) {
  Box(Modifier.fillMaxSize().padding(insets)) {
    accessories.forEach { accessory ->
      key(accessory) {
        Box(Modifier.align(accessory.alignment)) { accessory.Content(state) }
      }
    }
  }
}
