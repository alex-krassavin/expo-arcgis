package expo.modules.arcgis

import com.arcgismaps.Color
import com.arcgismaps.geometry.Geometry
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.PolygonBuilder
import com.arcgismaps.geometry.PolylineBuilder
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.symbology.SimpleFillSymbol
import com.arcgismaps.mapping.symbology.SimpleFillSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleLineSymbol
import com.arcgismaps.mapping.symbology.SimpleLineSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbol
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbolStyle
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
}

/** SharedObject wrapping a native [Graphic] — a point, polyline, or polygon with a simple symbol. */
class GraphicRef(appContext: AppContext) : SharedObject(appContext) {
  val graphic = Graphic()

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "geometry" -> graphic.geometry = (value as? Map<*, *>)?.let(::buildGeometry)
        "symbol" -> graphic.symbol = (value as? Map<*, *>)?.let(::buildSymbol)
      }
    }
  }
}

// region Geometry

private fun buildGeometry(g: Map<*, *>): Geometry? {
  val sr = spatialReference(g["spatialReference"])
  return when (g["type"]) {
    "point" -> Point(num(g["x"]), num(g["y"]), sr)
    "polyline" -> PolylineBuilder(sr).apply {
      vertices(g["points"]).forEach { (x, y) -> addPoint(x, y) }
    }.toGeometry()
    "polygon" -> PolygonBuilder(sr).apply {
      vertices(g["points"]).forEach { (x, y) -> addPoint(x, y) }
    }.toGeometry()
    else -> null
  }
}

private fun vertices(value: Any?): List<Pair<Double, Double>> =
  (value as? List<*>)?.mapNotNull { p ->
    (p as? Map<*, *>)?.let { num(it["x"]) to num(it["y"]) }
  } ?: emptyList()

/** Only WGS84 and Web Mercator are mapped in v1; any other WKID falls back to WGS84. */
private fun spatialReference(value: Any?): SpatialReference = when ((value as? Number)?.toInt()) {
  3857, 102100 -> SpatialReference.webMercator()
  else -> SpatialReference.wgs84()
}

private fun num(value: Any?, default: Double = 0.0): Double = (value as? Number)?.toDouble() ?: default

// region Symbols

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
