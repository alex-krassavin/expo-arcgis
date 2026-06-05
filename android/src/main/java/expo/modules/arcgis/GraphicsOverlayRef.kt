package expo.modules.arcgis

import com.arcgismaps.Color
import com.arcgismaps.mapping.symbology.SimpleFillSymbol
import com.arcgismaps.mapping.symbology.SimpleFillSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleLineSymbol
import com.arcgismaps.mapping.symbology.SimpleLineSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbol
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleRenderer
import com.arcgismaps.mapping.symbology.Symbol
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

  /** Sets a [SimpleRenderer] from the JS renderer dict, or clears it when null. */
  fun setRenderer(r: Map<String, Any?>?) {
    val symbolDict = r?.get("symbol") as? Map<*, *>
    overlay.renderer = symbolDict?.let(::buildSymbol)?.let { SimpleRenderer(it) }
  }
}

/** SharedObject wrapping a native [Graphic] — a point, polyline, or polygon with a simple symbol. */
class GraphicRef(appContext: AppContext) : SharedObject(appContext) {
  val graphic = Graphic()

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "geometry" -> graphic.geometry = (value as? Map<*, *>)?.let(::geometryFromDict)
        "symbol" -> graphic.symbol = (value as? Map<*, *>)?.let(::buildSymbol)
      }
    }
  }
}

// region Symbols

private fun num(value: Any?, default: Double = 0.0): Double = (value as? Number)?.toDouble() ?: default

private fun buildSymbol(s: Map<*, *>): Symbol? = when (s["type"]) {
  "simple-marker" -> SimpleMarkerSymbol(
    markerStyle(s["style"]),
    colorOf(s["color"]) ?: Color.fromRgba(255, 0, 0, 255),
    num(s["size"], 10.0).toFloat(),
  ).apply { outline = outlineOf(s["outline"]) }
  "simple-line" -> lineSymbol(s)
  "simple-fill" -> SimpleFillSymbol(
    fillStyle(s["style"]),
    colorOf(s["color"]) ?: Color.fromRgba(255, 0, 0, 255),
    outlineOf(s["outline"]),
  )
  else -> null
}

private fun lineSymbol(s: Map<*, *>): SimpleLineSymbol = SimpleLineSymbol(
  lineStyle(s["style"]),
  colorOf(s["color"]) ?: Color.fromRgba(0, 0, 255, 255),
  num(s["width"], 1.0).toFloat(),
)

private fun outlineOf(value: Any?): SimpleLineSymbol? = (value as? Map<*, *>)?.let(::lineSymbol)

/** Parses `#RRGGBB` / `#RRGGBBAA` (alpha last) into an ArcGIS [Color]. */
private fun colorOf(value: Any?): Color? {
  val hex = (value as? String)?.trim()?.removePrefix("#") ?: return null
  val v = hex.toLongOrNull(16) ?: return null
  return when (hex.length) {
    6 -> Color.fromRgba(
      ((v shr 16) and 0xff).toInt(),
      ((v shr 8) and 0xff).toInt(),
      (v and 0xff).toInt(),
      255,
    )
    8 -> Color.fromRgba(
      ((v shr 24) and 0xff).toInt(),
      ((v shr 16) and 0xff).toInt(),
      ((v shr 8) and 0xff).toInt(),
      (v and 0xff).toInt(),
    )
    else -> null
  }
}

private fun markerStyle(style: Any?): SimpleMarkerSymbolStyle = when (style) {
  "cross" -> SimpleMarkerSymbolStyle.Cross
  "diamond" -> SimpleMarkerSymbolStyle.Diamond
  "square" -> SimpleMarkerSymbolStyle.Square
  "triangle" -> SimpleMarkerSymbolStyle.Triangle
  "x" -> SimpleMarkerSymbolStyle.X
  else -> SimpleMarkerSymbolStyle.Circle
}

private fun lineStyle(style: Any?): SimpleLineSymbolStyle = when (style) {
  "dash" -> SimpleLineSymbolStyle.Dash
  "dot" -> SimpleLineSymbolStyle.Dot
  "dash-dot" -> SimpleLineSymbolStyle.DashDot
  "dash-dot-dot" -> SimpleLineSymbolStyle.DashDotDot
  "none" -> SimpleLineSymbolStyle.Null
  else -> SimpleLineSymbolStyle.Solid
}

private fun fillStyle(style: Any?): SimpleFillSymbolStyle = when (style) {
  "none" -> SimpleFillSymbolStyle.Null
  "horizontal" -> SimpleFillSymbolStyle.Horizontal
  "vertical" -> SimpleFillSymbolStyle.Vertical
  "cross" -> SimpleFillSymbolStyle.Cross
  "diagonal-cross" -> SimpleFillSymbolStyle.DiagonalCross
  "forward-diagonal" -> SimpleFillSymbolStyle.ForwardDiagonal
  "backward-diagonal" -> SimpleFillSymbolStyle.BackwardDiagonal
  else -> SimpleFillSymbolStyle.Solid
}
