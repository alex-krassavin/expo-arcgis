package expo.modules.arcgistoolkit

import android.view.View
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.arcgismaps.geometry.Envelope
import com.arcgismaps.mapping.GeoModel
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.floor.FloorFacility
import com.arcgismaps.mapping.floor.FloorSite
import com.arcgismaps.toolkit.indoors.ButtonPosition
import com.arcgismaps.toolkit.indoors.FloorFilter
import com.arcgismaps.toolkit.indoors.FloorFilterSelection
import com.arcgismaps.toolkit.indoors.FloorFilterState
import com.arcgismaps.toolkit.indoors.InitializationStatus
import com.arcgismaps.toolkit.indoors.UIProperties
import expo.modules.arcgis.GeoViewAccessory
import expo.modules.arcgis.GeoViewState
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.seconds

/**
 * The Toolkit's `FloorFilter` over a `<MapView>` or `<SceneView>` showing floor-aware data: it picks a
 * site, a facility and a level, and shows only that level's features. Choosing a site or facility
 * moves the view to it, as on iOS. Each selection is sent to JS (`selectionChange`).
 */
class FloorFilterAccessory(appContext: AppContext) : SharedObject(appContext), GeoViewAccessory {
  override var alignment by mutableStateOf<Alignment>(Alignment.BottomStart)
    private set

  // The Toolkit's UI properties (`uiProperties` in JS). The floor filter state keeps this object, so
  // new values are set on it in place, which keeps the selection.
  private val uiProperties = UIProperties()
  private var uiPropertiesVersion by mutableIntStateOf(0)

  fun update(props: Map<String, Any?>) {
    alignment = accessoryAlignment(props["alignment"], Alignment.BottomStart)
    val previous = uiProperties.copy()
    uiProperties.set(props["uiProperties"] as? Map<*, *>)
    if (uiProperties != previous) uiPropertiesVersion++
  }

  @Composable
  override fun Content(view: GeoViewState) {
    val geoModel: GeoModel = view.map ?: view.scene ?: return
    val scope = rememberCoroutineScope()
    // One state per map or scene; it loads the model and its floor manager itself.
    val state = remember(geoModel) {
      FloorFilterState(geoModel, uiProperties) { selection ->
        emit("selectionChange", floorFilterSelectionPayload(selection))
        val extent = when (val type = selection.type) {
          is FloorFilterSelection.Type.FloorSite -> type.site.geometry?.extent
          is FloorFilterSelection.Type.FloorFacility -> type.facility.geometry?.extent
          is FloorFilterSelection.Type.FloorLevel -> null
        }
        if (extent != null) {
          // The iOS Toolkit's move: to the site or facility's extent, expanded 1.5 times.
          val viewpoint = Viewpoint(Envelope(extent.center, extent.width * 1.5, extent.height * 1.5))
          scope.launch {
            val sceneViewProxy = view.sceneViewProxy
            if (sceneViewProxy != null) {
              sceneViewProxy.setViewpointAnimated(viewpoint, 0.5.seconds)
            } else {
              view.mapViewProxy.setViewpointAnimated(viewpoint, 0.5.seconds)
            }
          }
        }
      }
    }
    // New UI properties need a redraw: the floor filter holds them by reference. Only once it has
    // initialized, since a redraw drops its composition, which would cancel the initialization
    // midway; until then, its content isn't drawn yet and will read them when it is.
    val initialized = state.initializationStatus.value is InitializationStatus.Initialized
    // Padded from outside: the floor filter applies its modifier to its inner parts as well.
    Box(Modifier.padding(16.dp)) {
      key(if (initialized) uiPropertiesVersion else 0) {
        FloorFilter(floorFilterState = state)
      }
    }
  }
}

/** Sets the UI properties from JS's `uiProperties`; what it leaves out gets the Toolkit's default. */
private fun UIProperties.set(props: Map<*, *>?) {
  val defaults = UIProperties()
  // Colors come as ARGB numbers (`processColor`).
  fun color(key: String, default: Color) =
    (props?.get(key) as? Number)?.let { Color(it.toLong().toInt()) } ?: default
  fun visibility(key: String, default: Int) = when (props?.get(key)) {
    "visible" -> View.VISIBLE
    "invisible" -> View.INVISIBLE
    "gone" -> View.GONE
    else -> default
  }
  selectedBackgroundColor = color("selectedBackgroundColor", defaults.selectedBackgroundColor)
  selectedForegroundColor = color("selectedForegroundColor", defaults.selectedForegroundColor)
  searchBackgroundColor = color("searchBackgroundColor", defaults.searchBackgroundColor)
  textColor = color("textColor", defaults.textColor)
  backgroundColor = color("backgroundColor", defaults.backgroundColor)
  maxDisplayLevels = (props?.get("maxDisplayLevels") as? Number)?.toInt() ?: defaults.maxDisplayLevels
  siteFacilityButtonVisibility = visibility("siteFacilityButtonVisibility", defaults.siteFacilityButtonVisibility)
  closeButtonVisibility = visibility("closeButtonVisibility", defaults.closeButtonVisibility)
  closeButtonPosition = when (props?.get("closeButtonPosition")) {
    "top" -> ButtonPosition.Top
    "bottom" -> ButtonPosition.Bottom
    else -> defaults.closeButtonPosition
  }
  val size = props?.get("buttonSize") as? Map<*, *>
  buttonSize = Size(
    (size?.get("width") as? Number)?.toFloat() ?: defaults.buttonSize.width,
    (size?.get("height") as? Number)?.toFloat() ?: defaults.buttonSize.height,
  )
}

/** A floor filter selection for JS: the selected site, and its facility and level when selected. */
private fun floorFilterSelectionPayload(selection: FloorFilterSelection): Map<String, Any?> {
  fun site(site: FloorSite?) = site?.let { mapOf("id" to it.id, "name" to it.name) }
  fun facility(facility: FloorFacility?) = facility?.let { mapOf("id" to it.id, "name" to it.name) }
  return when (val type = selection.type) {
    is FloorFilterSelection.Type.FloorSite -> mapOf("site" to site(type.site))
    is FloorFilterSelection.Type.FloorFacility ->
      mapOf("site" to site(type.facility.site), "facility" to facility(type.facility))
    is FloorFilterSelection.Type.FloorLevel -> mapOf(
      "site" to site(type.level.facility?.site),
      "facility" to facility(type.level.facility),
      "level" to mapOf(
        "id" to type.level.id,
        "longName" to type.level.longName,
        "shortName" to type.level.shortName,
        "verticalOrder" to type.level.verticalOrder,
      ),
    )
  }
}
