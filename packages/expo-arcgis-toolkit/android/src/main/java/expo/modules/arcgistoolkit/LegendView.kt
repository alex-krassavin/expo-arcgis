package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.arcgismaps.mapping.GeoModel
import com.arcgismaps.mapping.layers.Layer
import com.arcgismaps.toolkit.legend.Legend
import com.arcgismaps.toolkit.legend.theme.LegendDefaults
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.GeoViewRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.seconds

/**
 * The Toolkit's `Legend` for a `<MapView>` or `<SceneView>`: the symbols of its map's or scene's
 * layers and basemap, at the view's current scale.
 */
class LegendView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private var geoViewRef by mutableStateOf<GeoViewRef?>(null)
  private var reverseLayerOrder by mutableStateOf(false)
  private var respectScaleRange by mutableStateOf(true)
  private var titleText by mutableStateOf<String?>(null)
  private var textStyles by mutableStateOf<Map<String, Any?>?>(null)

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** Receives the view the legend is for (expo-arcgis's GeoViewRef). */
  fun setGeoView(ref: GeoViewRef?) {
    geoViewRef = ref
  }

  fun setReverseLayerOrder(value: Boolean?) {
    reverseLayerOrder = value ?: false
  }

  fun setRespectScaleRange(value: Boolean?) {
    respectScaleRange = value ?: true
  }

  /** Null for the Toolkit's title; empty for none. */
  fun setTitle(value: String?) {
    titleText = value
  }

  fun setTypography(value: Map<String, Any?>?) {
    textStyles = value
  }

  @Composable
  private fun Content() {
    val view = geoViewRef?.state ?: return
    val geoModel: GeoModel = view.map ?: view.scene ?: return
    // The legend draws at the view's scale, which the view reports with its first viewpoint.
    val scale = view.viewpoint?.targetScale ?: return
    val basemap by geoModel.basemap.collectAsState()
    val defaults = LegendDefaults.typography()
    Legend(
      operationalLayers = rememberOperationalLayers(geoModel),
      basemap = basemap,
      currentScale = scale,
      modifier = Modifier.fillMaxSize(),
      reverseLayerOrder = reverseLayerOrder,
      respectScaleRange = respectScaleRange,
      title = titleText ?: stringResource(com.arcgismaps.toolkit.legend.R.string.title),
      typography = LegendDefaults.typography(
        title = defaults.title.merge(textStyle(textStyles?.get("title"))),
        layerName = defaults.layerName.merge(textStyle(textStyles?.get("layerName"))),
        subLayerName = defaults.subLayerName.merge(textStyle(textStyles?.get("subLayerName"))),
        legendInfoName = defaults.legendInfoName.merge(textStyle(textStyles?.get("legendInfoName"))),
      ),
    )
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}

/**
 * The geo model's operational layers, as a new list each time they change. The SDK doesn't report
 * changes to that list (layers declared in JS, a web map's once it loads), and the legend reads it
 * again only when it gets a new list, so it is compared every second.
 */
@Composable
private fun rememberOperationalLayers(geoModel: GeoModel): List<Layer> {
  var layers by remember(geoModel) { mutableStateOf(geoModel.operationalLayers.toList()) }
  LaunchedEffect(geoModel) {
    while (true) {
      delay(1.seconds)
      val now = geoModel.operationalLayers.toList()
      if (now != layers) layers = now
    }
  }
  return layers
}

/** A text style from JS (`{ fontSize, color, fontWeight }`), to merge over the Toolkit's. */
private fun textStyle(value: Any?): TextStyle {
  val style = value as? Map<*, *> ?: return TextStyle()
  return TextStyle(
    // Colors come as ARGB numbers (`processColor`).
    color = (style["color"] as? Number)?.let { Color(it.toLong().toInt()) } ?: Color.Unspecified,
    fontSize = (style["fontSize"] as? Number)?.toFloat()?.sp ?: TextUnit.Unspecified,
    fontWeight = when (val weight = style["fontWeight"]) {
      "normal" -> FontWeight.Normal
      "bold" -> FontWeight.Bold
      is String -> weight.toIntOrNull()?.let { FontWeight(it) }
      else -> null
    },
  )
}
