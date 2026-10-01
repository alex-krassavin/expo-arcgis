package expo.modules.arcgistoolkit

import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.arcgismaps.UnitSystem
import com.arcgismaps.toolkit.compass.Compass
import com.arcgismaps.toolkit.scalebar.Scalebar
import com.arcgismaps.toolkit.scalebar.ScalebarStyle
import expo.modules.arcgis.GeoViewAccessory
import expo.modules.arcgis.GeoViewState
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import java.util.Locale
import kotlinx.coroutines.launch

/** The JS `AccessoryAlignment`, as Compose places it. Leading/trailing follow the layout direction. */
internal fun accessoryAlignment(value: Any?, fallback: Alignment): Alignment = when (value) {
  "topLeading" -> Alignment.TopStart
  "top" -> Alignment.TopCenter
  "topTrailing" -> Alignment.TopEnd
  "leading" -> Alignment.CenterStart
  "center" -> Alignment.Center
  "trailing" -> Alignment.CenterEnd
  "bottomLeading" -> Alignment.BottomStart
  "bottom" -> Alignment.BottomCenter
  "bottomTrailing" -> Alignment.BottomEnd
  else -> fallback
}

/** The Toolkit's `Compass` over a `<MapView>`. Tapping it turns the map back to north, as on iOS. */
class CompassAccessory(appContext: AppContext) : SharedObject(appContext), GeoViewAccessory {
  override var alignment by mutableStateOf<Alignment>(Alignment.TopEnd)
    private set
  private var autoHide by mutableStateOf(true)
  /** Null keeps the Toolkit's size. */
  private var size by mutableStateOf<Dp?>(null)

  fun update(props: Map<String, Any?>) {
    alignment = accessoryAlignment(props["alignment"], Alignment.TopEnd)
    autoHide = props["autoHide"] as? Boolean ?: true
    size = (props["size"] as? Number)?.toFloat()?.dp
  }

  @Composable
  override fun Content(view: GeoViewState) {
    val scope = rememberCoroutineScope()
    val onClick: () -> Unit = { scope.launch { view.mapViewProxy.setViewpointRotation(0.0) } }
    val modifier = Modifier.padding(16.dp)
    val size = size
    if (size != null) {
      Compass(rotation = view.rotation, modifier = modifier, autoHide = autoHide, size = size, onClick = onClick)
    } else {
      Compass(rotation = view.rotation, modifier = modifier, autoHide = autoHide, onClick = onClick)
    }
  }
}

/** The Toolkit's `Scalebar` over a `<MapView>`. */
class ScalebarAccessory(appContext: AppContext) : SharedObject(appContext), GeoViewAccessory {
  override var alignment by mutableStateOf<Alignment>(Alignment.BottomStart)
    private set
  private var maxWidth by mutableStateOf(175.dp)
  private var style by mutableStateOf(ScalebarStyle.AlternatingBar)
  /** Null follows the device's measurement system, as the Toolkit does. */
  private var units by mutableStateOf<UnitSystem?>(null)
  private var minScale by mutableDoubleStateOf(0.0)
  private var useGeodeticCalculations by mutableStateOf(true)

  fun update(props: Map<String, Any?>) {
    alignment = accessoryAlignment(props["alignment"], Alignment.BottomStart)
    maxWidth = ((props["maxWidth"] as? Number)?.toFloat() ?: 175f).dp
    style = when (props["style"]) {
      "bar" -> ScalebarStyle.Bar
      "dualUnitLine" -> ScalebarStyle.DualUnitLine
      "graduatedLine" -> ScalebarStyle.GraduatedLine
      "line" -> ScalebarStyle.Line
      else -> ScalebarStyle.AlternatingBar
    }
    units = when (props["units"]) {
      "metric" -> UnitSystem.Metric
      "imperial" -> UnitSystem.Imperial
      else -> null
    }
    minScale = (props["minScale"] as? Number)?.toDouble() ?: 0.0
    useGeodeticCalculations = props["useGeodeticCalculations"] as? Boolean ?: true
  }

  @Composable
  override fun Content(view: GeoViewState) {
    // Nothing to measure until the map has drawn.
    if (view.unitsPerDip.isNaN()) return
    Scalebar(
      maxWidth = maxWidth,
      unitsPerDip = view.unitsPerDip,
      viewpoint = view.viewpoint,
      spatialReference = view.spatialReference,
      modifier = Modifier.padding(16.dp),
      minScale = minScale,
      useGeodeticCalculations = useGeodeticCalculations,
      style = style,
      units = units ?: deviceUnitSystem(),
    )
  }
}

/** The Toolkit's own default (its helper is private): imperial in the US, Liberia and Myanmar. */
private fun deviceUnitSystem(): UnitSystem = when (Locale.getDefault().country) {
  "US", "LR", "MM" -> UnitSystem.Imperial
  else -> UnitSystem.Metric
}
