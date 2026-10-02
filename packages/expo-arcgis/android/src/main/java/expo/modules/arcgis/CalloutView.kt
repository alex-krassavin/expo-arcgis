package expo.modules.arcgis

import android.content.Context
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.GeoElement
import com.arcgismaps.toolkit.geoviewcompose.GeoViewScope
import com.arcgismaps.toolkit.geoviewcompose.LeaderPosition
import com.arcgismaps.toolkit.geoviewcompose.theme.CalloutDefaults
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.views.ExpoView

/**
 * `<Callout>`: React content its `<MapView>` or `<SceneView>` shows in the Toolkit's callout, at a
 * location or a geo element. React lays the content out; the view takes it out of the React children
 * it draws over the map and hands it to the callout instead ([GeoViewReactChildren]).
 */
class ExpoArcgisCalloutView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var location by mutableStateOf<Point?>(null)
    private set
  var geoElement by mutableStateOf<GeoElement?>(null)
    private set
  var tapLocation by mutableStateOf<Point?>(null)
    private set
  /** In dp: right and down from the location. */
  var offset by mutableStateOf(Offset.Zero)
    private set
  var rotateOffsetWithGeoView by mutableStateOf(false)
    private set
  var leaderPosition by mutableStateOf<LeaderPosition>(LeaderPosition.LowerMiddle)
    private set
  /** The Toolkit's `CalloutColors` and `CalloutShapes` settings from JS; what is left out keeps its defaults. */
  var calloutColors by mutableStateOf<Map<String, Any?>?>(null)
    private set
  var calloutShapes by mutableStateOf<Map<String, Any?>?>(null)
    private set

  /** The content's size, in pixels, as React lays it out. */
  var contentSize by mutableStateOf(IntSize.Zero)
    private set

  init {
    addOnLayoutChangeListener { _, left, top, right, bottom, _, _, _, _ ->
      contentSize = IntSize(right - left, bottom - top)
    }
  }

  // React measures and lays the content out, as its own views do. As an Android view group (a
  // LinearLayout), this view would measure its children for a row and line them up in it — and a
  // text measured that way keeps the width it was measured for when it draws.
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = Unit

  fun setLocation(value: Map<String, Any?>?) {
    location = point(value)
  }

  /** A graphic (`GraphicRef`) or an identified feature (`FeatureRef`). */
  fun setGeoElement(ref: SharedObject?) {
    geoElement = when (ref) {
      is GraphicRef -> ref.graphic
      is FeatureRef -> ref.feature
      else -> null
    }
  }

  fun setTapLocation(value: Map<String, Any?>?) {
    tapLocation = point(value)
  }

  fun setOffset(value: Map<String, Any?>?) {
    offset = Offset(
      (value?.get("x") as? Number)?.toFloat() ?: 0f,
      (value?.get("y") as? Number)?.toFloat() ?: 0f,
    )
  }

  fun setRotateOffsetWithGeoView(value: Boolean?) {
    rotateOffsetWithGeoView = value ?: false
  }

  fun setLeaderPosition(value: String?) {
    leaderPosition = when (value) {
      "automatic" -> LeaderPosition.Automatic
      "upperLeftCorner" -> LeaderPosition.UpperLeftCorner
      "upperMiddle" -> LeaderPosition.UpperMiddle
      "upperRightCorner" -> LeaderPosition.UpperRightCorner
      "rightMiddle" -> LeaderPosition.RightMiddle
      "lowerRightCorner" -> LeaderPosition.LowerRightCorner
      "lowerLeftCorner" -> LeaderPosition.LowerLeftCorner
      "leftMiddle" -> LeaderPosition.LeftMiddle
      else -> LeaderPosition.LowerMiddle
    }
  }

  fun setColors(value: Map<String, Any?>?) {
    calloutColors = value
  }

  fun setShapes(value: Map<String, Any?>?) {
    calloutShapes = value
  }

  /** `{ latitude, longitude, altitude? }`; in a scene, a location without an altitude is at sea level. */
  private fun point(value: Map<String, Any?>?): Point? {
    val latitude = (value?.get("latitude") as? Number)?.toDouble() ?: return null
    val longitude = (value["longitude"] as? Number)?.toDouble() ?: return null
    val altitude = (value["altitude"] as? Number)?.toDouble()
    return if (altitude != null) Point(longitude, latitude, altitude, SpatialReference.wgs84())
    else Point(longitude, latitude, SpatialReference.wgs84())
  }
}

/**
 * A geo view's React children: drawn over the map in [layer], except a `<Callout>`, which shows in
 * the Toolkit's callout instead. Fabric manages children by index, so this keeps them all in its
 * order and maps their indices to the layer's.
 */
internal class GeoViewReactChildren(context: Context) {
  val layer = ReactChildrenLayer(context)
  private val children = mutableListOf<View>()

  /** The callout to show: the last one React mounted. */
  var callout by mutableStateOf<ExpoArcgisCalloutView?>(null)
    private set

  val count: Int
    get() = children.size

  fun childAt(index: Int): View = children[index]

  fun add(child: View, index: Int) {
    val drawn = drawnCount(index)
    children.add(index.coerceAtMost(children.size), child)
    if (child is ExpoArcgisCalloutView) updateCallout() else layer.addView(child, drawn)
  }

  fun remove(child: View) {
    val index = children.indexOf(child)
    if (index >= 0) removeAt(index)
  }

  fun removeAt(index: Int) {
    val child = children.removeAt(index)
    if (child is ExpoArcgisCalloutView) updateCallout() else layer.removeView(child)
  }

  private fun drawnCount(index: Int) = children.take(index).count { it !is ExpoArcgisCalloutView }

  private fun updateCallout() {
    callout = children.lastOrNull { it is ExpoArcgisCalloutView } as? ExpoArcgisCalloutView
  }
}

/** Shows a `<Callout>`'s React content in the Toolkit's callout, at its location or geo element. */
@Composable
internal fun GeoViewScope.ReactCallout(view: ExpoArcgisCalloutView?) {
  view ?: return
  val density = LocalDensity.current
  val size = with(density) { DpSize(view.contentSize.width.toDp(), view.contentSize.height.toDp()) }
  val defaultColors = CalloutDefaults.colors()
  val colors = CalloutDefaults.colors(
    backgroundColor = color(view.calloutColors?.get("backgroundColor")) ?: defaultColors.backgroundColor,
    borderColor = color(view.calloutColors?.get("borderColor")) ?: defaultColors.borderColor,
  )
  val shapes = calloutShapes(view.calloutShapes)
  val content: @Composable androidx.compose.foundation.layout.BoxScope.() -> Unit = {
    AndroidView(factory = { CalloutContainer(it).apply { show(view) } }, modifier = Modifier.size(size)) {
      it.show(view)
    }
  }
  val geoElement = view.geoElement
  val location = view.location
  when {
    geoElement != null -> Callout(
      geoElement = geoElement,
      tapLocation = view.tapLocation,
      leaderPosition = view.leaderPosition,
      colorScheme = colors,
      shapes = shapes,
      content = content,
    )
    location != null -> Callout(
      location = location,
      offset = with(density) { Offset(view.offset.x.dp.toPx(), view.offset.y.dp.toPx()) },
      leaderPosition = view.leaderPosition,
      rotateOffsetWithGeoView = view.rotateOffsetWithGeoView,
      colorScheme = colors,
      shapes = shapes,
      content = content,
    )
  }
}

/** The Toolkit's callout shapes, with the settings JS gave; in dp. */
@Composable
private fun calloutShapes(props: Map<String, Any?>?) = run {
  val defaults = CalloutDefaults.shapes()
  fun dp(key: String) = (props?.get(key) as? Number)?.toFloat()?.dp
  fun size(key: String) = (props?.get(key) as? Map<*, *>)?.let {
    DpSize(((it["width"] as? Number)?.toFloat() ?: 0f).dp, ((it["height"] as? Number)?.toFloat() ?: 0f).dp)
  }
  val cornerRadius = dp("cornerRadius") ?: 10.dp
  val borderWidth = dp("borderWidth") ?: 2.dp
  CalloutDefaults.shapes(
    cornerRadius = cornerRadius,
    borderWidth = borderWidth,
    leaderSize = size("leaderSize") ?: defaults.leaderSize,
    calloutContentPadding = dp("contentPadding")?.let { PaddingValues(it) }
      ?: PaddingValues(cornerRadius + borderWidth / 2),
    minSize = size("minSize") ?: DpSize(borderWidth + cornerRadius * 2, borderWidth + cornerRadius * 2),
  )
}

/** A color from JS (`processColor`'s ARGB number). */
private fun color(value: Any?): Color? = (value as? Number)?.let { Color(it.toLong().toInt()) }

/**
 * The callout's Android view: holds the React content and leaves it where React lays it out (at its
 * own origin), sized by the callout.
 */
private class CalloutContainer(context: Context) : ViewGroup(context) {
  fun show(view: ExpoArcgisCalloutView) {
    if (view.parent === this) return
    (view.parent as? ViewGroup)?.removeView(view)
    addView(view)
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = Unit
}
