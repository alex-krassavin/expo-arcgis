package expo.modules.arcgis

import android.graphics.Color as AndroidColor
import com.arcgismaps.Color
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbol
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbolStyle
import com.arcgismaps.mapping.view.Graphic
import com.arcgismaps.mapping.view.GraphicsOverlay
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/** SharedObject wrapping a native [GraphicsOverlay] owned by a MapView. */
class GraphicsOverlayRef(appContext: AppContext) : SharedObject(appContext) {
  val overlay = GraphicsOverlay()

  fun addGraphic(ref: GraphicRef) {
    overlay.graphics.add(ref.graphic)
  }

  fun removeGraphic(ref: GraphicRef) {
    overlay.graphics.remove(ref.graphic)
  }
}

/** SharedObject wrapping a native [Graphic] — a point with a simple marker symbol in v1. */
class GraphicRef(appContext: AppContext) : SharedObject(appContext) {
  val graphic = Graphic()

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "point" -> (value as? Map<*, *>)?.let { p ->
          val lat = (p["latitude"] as? Number)?.toDouble()
          val lon = (p["longitude"] as? Number)?.toDouble()
          if (lat != null && lon != null) {
            graphic.geometry = Point(lon, lat, SpatialReference.wgs84())
          }
        }
        "symbol" -> (value as? Map<*, *>)?.let { s -> graphic.symbol = buildMarkerSymbol(s) }
      }
    }
  }
}

private fun buildMarkerSymbol(s: Map<*, *>): SimpleMarkerSymbol {
  val color = (s["color"] as? String)?.let(::parseColor) ?: parseColor("#ff0000")
  val size = (s["size"] as? Number)?.toFloat() ?: 10f
  return SimpleMarkerSymbol(markerStyle(s["style"] as? String), color, size)
}

private fun markerStyle(style: String?): SimpleMarkerSymbolStyle = when (style) {
  "square" -> SimpleMarkerSymbolStyle.Square
  "cross" -> SimpleMarkerSymbolStyle.Cross
  "diamond" -> SimpleMarkerSymbolStyle.Diamond
  "triangle" -> SimpleMarkerSymbolStyle.Triangle
  "x" -> SimpleMarkerSymbolStyle.X
  else -> SimpleMarkerSymbolStyle.Circle
}

private fun parseColor(hex: String): Color {
  val argb = AndroidColor.parseColor(hex)
  return Color.fromRgba(
    AndroidColor.red(argb),
    AndroidColor.green(argb),
    AndroidColor.blue(argb),
    AndroidColor.alpha(argb)
  )
}
