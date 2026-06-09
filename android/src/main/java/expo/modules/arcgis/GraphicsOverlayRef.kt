package expo.modules.arcgis

import com.arcgismaps.Color
import com.arcgismaps.mapping.labeling.ArcadeLabelExpression
import com.arcgismaps.mapping.labeling.LabelDefinition
import com.arcgismaps.mapping.labeling.SimpleLabelExpression
import com.arcgismaps.mapping.reduction.ClusteringFeatureReduction
import com.arcgismaps.mapping.reduction.FeatureReduction
import com.arcgismaps.mapping.symbology.ClassBreak
import com.arcgismaps.mapping.symbology.ClassBreaksRenderer
import com.arcgismaps.mapping.symbology.CompositeSymbol
import com.arcgismaps.mapping.symbology.HorizontalAlignment
import com.arcgismaps.mapping.symbology.Renderer
import com.arcgismaps.mapping.symbology.SceneSymbolAnchorPosition
import com.arcgismaps.mapping.symbology.SimpleFillSymbol
import com.arcgismaps.mapping.symbology.SimpleFillSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleLineSymbol
import com.arcgismaps.mapping.symbology.SimpleLineSymbolStyle
import com.arcgismaps.mapping.symbology.DistanceCompositeSceneSymbol
import com.arcgismaps.mapping.symbology.DistanceSymbolRange
import com.arcgismaps.mapping.symbology.SimpleMarkerSceneSymbol
import com.arcgismaps.mapping.symbology.SimpleMarkerSceneSymbolStyle
import com.arcgismaps.mapping.symbology.MultilayerPointSymbol
import com.arcgismaps.mapping.symbology.MultilayerPolygonSymbol
import com.arcgismaps.mapping.symbology.PictureFillSymbol
import com.arcgismaps.mapping.symbology.PictureMarkerSymbol
import com.arcgismaps.mapping.symbology.PictureMarkerSymbolLayer
import com.arcgismaps.mapping.symbology.SolidFillSymbolLayer
import com.arcgismaps.mapping.symbology.SolidStrokeSymbolLayer
import com.arcgismaps.mapping.symbology.VectorMarkerSymbolElement
import com.arcgismaps.mapping.symbology.VectorMarkerSymbolLayer
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbol
import com.arcgismaps.mapping.symbology.SimpleMarkerSymbolStyle
import com.arcgismaps.mapping.symbology.SimpleRenderer
import com.arcgismaps.mapping.symbology.Symbol
import com.arcgismaps.mapping.symbology.TextSymbol
import com.arcgismaps.mapping.symbology.UniqueValue
import com.arcgismaps.mapping.symbology.UniqueValueRenderer
import com.arcgismaps.mapping.symbology.VerticalAlignment
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

  /** Sets a renderer (simple / unique-value / class-breaks) from the JS dict, or clears it. */
  fun setRenderer(r: Map<String, Any?>?) {
    overlay.renderer = r?.let(::buildRenderer)
  }
}

// region Renderers

/**
 * Builds a [Renderer] (simple / unique-value / class-breaks) from a JS renderer dict.
 * Shared by [GraphicsOverlayRef.setRenderer] and [FeatureLayerRef.applyProps].
 *
 * When `visualVariables` is present, round-trips through [Renderer.toJson] /
 * [Renderer.Companion.fromJsonOrNull] so the native C++ engine applies data-driven
 * size/color/rotation/opacity — typed Kotlin wrappers do not expose `VisualVariable` classes
 * in SDK 300.0.0.
 */
internal fun buildRenderer(r: Map<*, *>): Renderer? {
  val typed: Renderer? = when (r["type"]) {
    "simple" -> (r["symbol"] as? Map<*, *>)?.let(::buildSymbol)?.let { SimpleRenderer(it) }
    "unique-value" -> {
      val fields = (r["fields"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
      val values = (r["uniqueValues"] as? List<*>)?.mapNotNull { uv ->
        (uv as? Map<*, *>)?.let {
          val symbol = (it["symbol"] as? Map<*, *>)?.let(::buildSymbol) ?: return@mapNotNull null
          UniqueValue(it["label"] as? String ?: "", "", symbol, rendererValues(it["values"]))
        }
      } ?: emptyList()
      UniqueValueRenderer(
        fields,
        values,
        r["defaultLabel"] as? String ?: "",
        (r["defaultSymbol"] as? Map<*, *>)?.let(::buildSymbol) ?: transparentMarker(),
      )
    }
    "class-breaks" -> {
      val breaks = (r["classBreaks"] as? List<*>)?.mapNotNull { cb ->
        (cb as? Map<*, *>)?.let {
          val symbol = (it["symbol"] as? Map<*, *>)?.let(::buildSymbol) ?: return@mapNotNull null
          ClassBreak(it["label"] as? String ?: "", "", num(it["min"]), num(it["max"]), symbol)
        }
      } ?: emptyList()
      ClassBreaksRenderer(r["field"] as? String ?: "", breaks).apply {
        (r["defaultSymbol"] as? Map<*, *>)?.let(::buildSymbol)?.let { defaultSymbol = it }
      }
    }
    else -> null
  }
  // If visualVariables are present, inject them into the renderer JSON and reconstruct.
  val vvRaw = (r["visualVariables"] as? List<*>)?.mapNotNull { it as? Map<*, *> }
  if (vvRaw.isNullOrEmpty() || typed == null) return typed
  return applyVisualVariables(vvRaw, typed) ?: typed
}

/**
 * Builds the ArcGIS REST JSON representation of [vvRaw], injects it into [renderer]'s own JSON,
 * and reconstructs the renderer so the native C++ engine applies data-driven symbology.
 * Returns `null` if JSON manipulation fails; the caller falls back to [renderer].
 */
private fun applyVisualVariables(vvRaw: List<Map<*, *>>, renderer: Renderer): Renderer? {
  val vvJson = vvRaw.mapNotNull(::buildVisualVariableJson)
  if (vvJson.isEmpty()) return null
  return try {
    val rendererJson = renderer.toJson()
    val rendererMap = jsonObjToMap(org.json.JSONObject(rendererJson))
    rendererMap["visualVariables"] = vvJson
    val modifiedJson = mapToJsonObject(rendererMap).toString()
    Renderer.fromJsonOrNull(modifiedJson)
  } catch (e: Exception) {
    null
  }
}

/** Converts an [org.json.JSONObject] to a mutable [Map] recursively (for round-trip JSON mutation). */
private fun jsonObjToMap(obj: org.json.JSONObject): MutableMap<String, Any?> {
  val map = mutableMapOf<String, Any?>()
  for (key in obj.keys()) {
    map[key] = when (val v = obj.get(key)) {
      is org.json.JSONObject -> jsonObjToMap(v)
      is org.json.JSONArray -> jsonArrToList(v)
      org.json.JSONObject.NULL -> null
      else -> v
    }
  }
  return map
}

private fun jsonArrToList(arr: org.json.JSONArray): List<Any?> =
  (0 until arr.length()).map { i ->
    when (val v = arr.get(i)) {
      is org.json.JSONObject -> jsonObjToMap(v)
      is org.json.JSONArray -> jsonArrToList(v)
      org.json.JSONObject.NULL -> null
      else -> v
    }
  }

/** Recursively converts a [Map] to a [org.json.JSONObject]. */
private fun mapToJsonObject(map: Map<*, *>): org.json.JSONObject {
  val obj = org.json.JSONObject()
  for ((k, v) in map) {
    val key = k?.toString() ?: continue
    when (v) {
      null -> obj.put(key, org.json.JSONObject.NULL)
      is Map<*, *> -> obj.put(key, mapToJsonObject(v))
      is List<*> -> obj.put(key, listToJsonArray(v))
      else -> obj.put(key, v)
    }
  }
  return obj
}

/** Recursively converts a [List] to a [org.json.JSONArray]. */
private fun listToJsonArray(list: List<*>): org.json.JSONArray {
  val arr = org.json.JSONArray()
  for (v in list) {
    when (v) {
      null -> arr.put(org.json.JSONObject.NULL)
      is Map<*, *> -> arr.put(mapToJsonObject(v))
      is List<*> -> arr.put(listToJsonArray(v))
      else -> arr.put(v)
    }
  }
  return arr
}

/**
 * Converts one JS `VisualVariable` map to the ArcGIS REST JSON map understood by the native
 * renderer engine. Hex color strings (`#RRGGBB`/`#RRGGBBAA`, alpha-last) are converted to
 * `[R, G, B, A]` integer lists as required by the REST spec.
 */
private fun buildVisualVariableJson(vv: Map<*, *>): Map<String, Any?>? = when (vv["type"]) {
  "size" -> buildMap {
    put("type", "sizeInfo")
    (vv["field"] as? String)?.let { put("field", it) }
    (vv["valueExpression"] as? String)?.let { put("valueExpression", it) }
    (vv["minDataValue"] as? Number)?.toDouble()?.let { put("minDataValue", it) }
    (vv["maxDataValue"] as? Number)?.toDouble()?.let { put("maxDataValue", it) }
    (vv["minSize"] as? Number)?.toDouble()?.let { put("minSize", it) }
    (vv["maxSize"] as? Number)?.toDouble()?.let { put("maxSize", it) }
    (vv["stops"] as? List<*>)?.mapNotNull { s ->
      (s as? Map<*, *>)?.let {
        val value = (it["value"] as? Number)?.toDouble() ?: return@mapNotNull null
        val size = (it["size"] as? Number)?.toDouble() ?: return@mapNotNull null
        mapOf("value" to value, "size" to size)
      }
    }?.takeIf { it.isNotEmpty() }?.let { put("stops", it) }
  }
  "color" -> buildMap {
    put("type", "colorInfo")
    (vv["field"] as? String)?.let { put("field", it) }
    (vv["valueExpression"] as? String)?.let { put("valueExpression", it) }
    (vv["stops"] as? List<*>)?.mapNotNull { s ->
      (s as? Map<*, *>)?.let {
        val value = (it["value"] as? Number)?.toDouble() ?: return@mapNotNull null
        val colorArr = restColor(it["color"]) ?: return@mapNotNull null
        mapOf("value" to value, "color" to colorArr)
      }
    }?.takeIf { it.isNotEmpty() }?.let { put("stops", it) }
  }
  "rotation" -> buildMap {
    put("type", "rotationInfo")
    (vv["field"] as? String)?.let { put("field", it) }
    (vv["valueExpression"] as? String)?.let { put("valueExpression", it) }
    (vv["rotationType"] as? String)?.let { put("rotationType", it) }
  }
  "opacity" -> buildMap {
    put("type", "opacityInfo")
    (vv["field"] as? String)?.let { put("field", it) }
    (vv["valueExpression"] as? String)?.let { put("valueExpression", it) }
    (vv["stops"] as? List<*>)?.mapNotNull { s ->
      (s as? Map<*, *>)?.let {
        val value = (it["value"] as? Number)?.toDouble() ?: return@mapNotNull null
        val opacity = (it["opacity"] as? Number)?.toDouble() ?: return@mapNotNull null
        mapOf("value" to value, "opacity" to opacity)
      }
    }?.takeIf { it.isNotEmpty() }?.let { put("stops", it) }
  }
  else -> null // skip unknown visual variable types gracefully
}

/**
 * Converts a hex color string (`#RRGGBB` / `#RRGGBBAA`, alpha-last) to an
 * `[R, G, B, A]` integer list as required by the ArcGIS REST renderer JSON spec.
 */
private fun restColor(value: Any?): List<Int>? {
  val hex = (value as? String)?.trim()?.removePrefix("#") ?: return null
  val v = hex.toLongOrNull(16) ?: return null
  return when (hex.length) {
    6 -> listOf(((v shr 16) and 0xff).toInt(), ((v shr 8) and 0xff).toInt(), (v and 0xff).toInt(), 255)
    8 -> listOf(((v shr 24) and 0xff).toInt(), ((v shr 16) and 0xff).toInt(), ((v shr 8) and 0xff).toInt(), (v and 0xff).toInt())
    else -> null
  }
}

/** Converts JS unique values to comparable scalars (whole numbers → Int, else Double/String). */
private fun rendererValues(value: Any?): List<Any> =
  (value as? List<*>)?.mapNotNull { item ->
    when (item) {
      is Number -> if (item.toDouble() == kotlin.math.floor(item.toDouble())) item.toInt() else item.toDouble()
      null -> null
      else -> item.toString()
    }
  } ?: emptyList()

// region Labels

/** Builds a [LabelDefinition] (expression + text symbol + optional where clause) from a JS dict. */
internal fun buildLabelDefinition(d: Map<*, *>): LabelDefinition {
  val expressionText = d["expression"] as? String ?: ""
  val expression =
    if (d["useArcade"] == true) ArcadeLabelExpression(expressionText) else SimpleLabelExpression(expressionText)
  val textSymbol = (d["symbol"] as? Map<*, *>)?.let { buildSymbol(it) } as? TextSymbol
    ?: TextSymbol("", Color.fromRgba(0, 0, 0, 255), 12f, HorizontalAlignment.Center, VerticalAlignment.Middle)
  return LabelDefinition(expression, textSymbol).apply {
    (d["whereClause"] as? String)?.let { whereClause = it }
  }
}

// region Feature reduction

/** Builds a [FeatureReduction] (currently clustering) from a JS dict. */
internal fun buildFeatureReduction(d: Map<*, *>): FeatureReduction? = when (d["type"]) {
  "cluster" -> {
    val renderer = (d["renderer"] as? Map<*, *>)?.let { buildRenderer(it) } ?: defaultClusterRenderer()
    ClusteringFeatureReduction(renderer).apply {
      (d["radius"] as? Number)?.toDouble()?.let { radius = it }
      (d["minSymbolSize"] as? Number)?.toDouble()?.let { minSymbolSize = it }
      (d["maxSymbolSize"] as? Number)?.toDouble()?.let { maxSymbolSize = it }
      (d["enabled"] as? Boolean)?.let { isEnabled = it }
    }
  }
  else -> null
}

private fun defaultClusterRenderer(): Renderer =
  SimpleRenderer(SimpleMarkerSymbol(SimpleMarkerSymbolStyle.Circle, Color.fromRgba(0, 122, 255, 255), 18f))

/** Invisible marker used as a UniqueValueRenderer default when JS supplies none (Kotlin requires non-null). */
private fun transparentMarker(): Symbol =
  SimpleMarkerSymbol(SimpleMarkerSymbolStyle.Circle, Color.fromRgba(0, 0, 0, 0), 0f)

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
  "text" -> TextSymbol(
    s["text"] as? String ?: "",
    colorOf(s["color"]) ?: Color.fromRgba(0, 0, 0, 255),
    num(s["size"], 12.0).toFloat(),
    horizontalAlignment(s["horizontalAlignment"]),
    verticalAlignment(s["verticalAlignment"]),
  ).apply {
    colorOf(s["haloColor"])?.let { haloColor = it }
    (s["haloWidth"] as? Number)?.toFloat()?.let { haloWidth = it }
    (s["fontFamily"] as? String)?.let { fontFamily = it }
  }
  "simple-marker-scene" -> SimpleMarkerSceneSymbol(
    sceneSymbolStyle(s["style"]),
    colorOf(s["color"]) ?: Color.fromRgba(211, 211, 211, 255),
    num(s["width"], 100.0),
    num(s["height"], 100.0),
    num(s["depth"], 100.0),
    sceneSymbolAnchor(s["anchor"]),
  )
  "picture-marker" -> (s["url"] as? String)?.let { url ->
    PictureMarkerSymbol(url).apply {
      (s["width"] as? Number)?.toFloat()?.let { width = it }
      (s["height"] as? Number)?.toFloat()?.let { height = it }
    }
  }
  "picture-fill" -> (s["url"] as? String)?.let { url ->
    PictureFillSymbol(url).apply {
      (s["width"] as? Number)?.toFloat()?.let { width = it }
      (s["height"] as? Number)?.toFloat()?.let { height = it }
      outline = outlineOf(s["outline"])
    }
  }
  "distance-composite-scene" -> {
    val composite = DistanceCompositeSceneSymbol()
    val rangeList = s["ranges"] as? List<*> ?: emptyList<Any>()
    for (rd in rangeList) {
      val rdMap = rd as? Map<*, *> ?: continue
      val sym = (rdMap["symbol"] as? Map<*, *>)?.let(::buildSymbol) ?: continue
      val range = DistanceSymbolRange(
        sym,
        (rdMap["minDistance"] as? Number)?.toDouble(),
        (rdMap["maxDistance"] as? Number)?.toDouble(),
      )
      composite.ranges.add(range)
    }
    composite
  }
  "composite" -> {
    val symbolList = (s["symbols"] as? List<*> ?: emptyList<Any>()).mapNotNull { item ->
      (item as? Map<*, *>)?.let(::buildSymbol)
    }
    CompositeSymbol(symbolList)
  }
  "multilayer-point" -> {
    // Build each symbol layer and assemble a MultilayerPointSymbol.
    // symbolLayers on MultilayerSymbol is a mutable List — populated via the constructor.
    val layerDicts = s["symbolLayers"] as? List<*> ?: emptyList<Any>()
    val symbolLayers = layerDicts.mapNotNull { ld ->
      val ldMap = ld as? Map<*, *> ?: return@mapNotNull null
      when (ldMap["type"]) {
        "picture-marker" -> {
          val url = ldMap["url"] as? String ?: return@mapNotNull null
          PictureMarkerSymbolLayer(url).apply {
            (ldMap["size"] as? Number)?.toDouble()?.let { size = it }
            (ldMap["width"] as? Number)?.toDouble()?.let { size = it }
            (ldMap["height"] as? Number)?.toDouble()?.let { size = it }
            (ldMap["offsetX"] as? Number)?.toDouble()?.let { offsetX = it }
            (ldMap["offsetY"] as? Number)?.toDouble()?.let { offsetY = it }
          }
        }
        "vector-marker" -> {
          // DEFER: polyline / multipoint element geometries are not yet supported — only polygon.
          val geomMap = ldMap["geometry"] as? Map<*, *> ?: return@mapNotNull null
          if (geomMap["type"] != "polygon") return@mapNotNull null
          val geom = geometryFromDict(geomMap) ?: return@mapNotNull null
          val fillColor = colorOf(ldMap["fillColor"]) ?: Color.fromRgba(255, 0, 0, 255)
          val elementLayers = buildList {
            add(SolidFillSymbolLayer(fillColor))
            colorOf(ldMap["outlineColor"])?.let { outlineColor ->
              val outlineWidth = (ldMap["outlineWidth"] as? Number)?.toDouble() ?: 1.0
              add(SolidStrokeSymbolLayer(outlineWidth, outlineColor))
            }
          }
          val fillSymbol = MultilayerPolygonSymbol(elementLayers)
          val element = VectorMarkerSymbolElement(geom, fillSymbol)
          VectorMarkerSymbolLayer(listOf(element)).apply {
            (ldMap["size"] as? Number)?.toDouble()?.let { size = it }
          }
        }
        else -> null
      }
    }
    MultilayerPointSymbol(symbolLayers)
  }
  else -> null
}

private fun sceneSymbolStyle(value: Any?): SimpleMarkerSceneSymbolStyle = when (value) {
  "cone" -> SimpleMarkerSceneSymbolStyle.Cone
  "cube" -> SimpleMarkerSceneSymbolStyle.Cube
  "cylinder" -> SimpleMarkerSceneSymbolStyle.Cylinder
  "diamond" -> SimpleMarkerSceneSymbolStyle.Diamond
  "tetrahedron" -> SimpleMarkerSceneSymbolStyle.Tetrahedron
  else -> SimpleMarkerSceneSymbolStyle.Sphere
}

private fun sceneSymbolAnchor(value: Any?): SceneSymbolAnchorPosition = when (value) {
  "center" -> SceneSymbolAnchorPosition.Center
  "top" -> SceneSymbolAnchorPosition.Top
  "origin" -> SceneSymbolAnchorPosition.Origin
  else -> SceneSymbolAnchorPosition.Bottom
}

private fun horizontalAlignment(value: Any?): HorizontalAlignment = when (value) {
  "left" -> HorizontalAlignment.Left
  "right" -> HorizontalAlignment.Right
  "justify" -> HorizontalAlignment.Justify
  else -> HorizontalAlignment.Center
}

private fun verticalAlignment(value: Any?): VerticalAlignment = when (value) {
  "top" -> VerticalAlignment.Top
  "bottom" -> VerticalAlignment.Bottom
  "baseline" -> VerticalAlignment.Baseline
  else -> VerticalAlignment.Middle
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
