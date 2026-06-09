import ArcGIS
import ExpoModulesCore
import UIKit

/// SharedObject wrapping a native `GraphicsOverlay` owned by a MapView.
public class GraphicsOverlayRef: SharedObject {
  let overlay = GraphicsOverlay()

  func addGraphic(_ ref: GraphicRef) {
    overlay.addGraphic(ref.graphic)
  }

  func removeGraphic(_ ref: GraphicRef) {
    overlay.removeGraphic(ref.graphic)
  }

  /// Sets a renderer (simple / unique-value / class-breaks) from the JS dict, or clears it.
  func setRenderer(_ r: [String: Any]?) {
    overlay.renderer = r.flatMap(buildRenderer)
  }
}

/// SharedObject wrapping a native `Graphic` — a point, polyline, or polygon with a simple symbol.
public final class GraphicRef: SharedObject {
  let graphic = Graphic()

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "geometry":
        graphic.geometry = (value as? [String: Any]).flatMap(geometryFromDict)
      case "symbol":
        graphic.symbol = (value as? [String: Any]).flatMap(buildSymbol)
      default:
        break
      }
    }
  }
}

// MARK: - Renderers

/// Builds a `Renderer` (simple / unique-value / class-breaks) from a JS renderer dict.
/// Shared by `GraphicsOverlayRef.setRenderer` and `FeatureLayerRef.applyProps`.
/// When `visualVariables` is present, round-trips through `Renderer.toJSON` / `Renderer.fromJSON`
/// so the native C++ engine applies data-driven size/color/rotation/opacity — typed Swift wrappers
/// do not expose `VisualVariable` classes in SDK 300.0.0.
func buildRenderer(_ r: [String: Any]) -> Renderer? {
  let typed: Renderer?
  switch r["type"] as? String {
  case "simple":
    typed = (r["symbol"] as? [String: Any]).flatMap(buildSymbol).map(SimpleRenderer.init(symbol:))
  case "unique-value":
    let values = (r["uniqueValues"] as? [[String: Any]] ?? []).compactMap { uv -> UniqueValue? in
      guard let symbol = (uv["symbol"] as? [String: Any]).flatMap(buildSymbol) else { return nil }
      return UniqueValue(
        label: uv["label"] as? String ?? "", symbol: symbol, values: rendererValues(uv["values"])
      )
    }
    typed = UniqueValueRenderer(
      fieldNames: r["fields"] as? [String] ?? [],
      uniqueValues: values,
      defaultLabel: r["defaultLabel"] as? String ?? "",
      defaultSymbol: (r["defaultSymbol"] as? [String: Any]).flatMap(buildSymbol)
    )
  case "class-breaks":
    let breaks = (r["classBreaks"] as? [[String: Any]] ?? []).compactMap { cb -> ClassBreak? in
      guard let symbol = (cb["symbol"] as? [String: Any]).flatMap(buildSymbol) else { return nil }
      return ClassBreak(
        label: cb["label"] as? String ?? "",
        minValue: rendererNumber(cb["min"]), maxValue: rendererNumber(cb["max"]), symbol: symbol
      )
    }
    let cbr = ClassBreaksRenderer(fieldName: r["field"] as? String ?? "", classBreaks: breaks)
    cbr.defaultSymbol = (r["defaultSymbol"] as? [String: Any]).flatMap(buildSymbol)
    typed = cbr
  default:
    typed = nil
  }
  // If visualVariables are present, inject them into the renderer JSON and reconstruct.
  guard let vvRaw = r["visualVariables"] as? [[String: Any]], !vvRaw.isEmpty,
        let renderer = typed else {
    return typed
  }
  return applyVisualVariables(vvRaw, to: renderer) ?? renderer
}

/// Builds the ArcGIS REST JSON representation of `visualVariables` from the JS dict array,
/// injects it into the renderer's own JSON, and reconstructs the renderer so the native
/// C++ engine applies data-driven symbology (size / color / rotation / opacity).
/// Returns `nil` if JSON manipulation fails; the caller falls back to the unmodified renderer.
private func applyVisualVariables(_ vvRaw: [[String: Any]], to renderer: Renderer) -> Renderer? {
  let vvJson = vvRaw.compactMap(buildVisualVariableJson)
  guard !vvJson.isEmpty else { return nil }
  // Round-trip: typed renderer → JSON dict → inject visualVariables → reconstruct.
  let rendererData = renderer.toJSON()
  guard var rendererDict = try? JSONSerialization.jsonObject(with: rendererData) as? [String: Any] else { return nil }
  rendererDict["visualVariables"] = vvJson
  guard let modifiedData = try? JSONSerialization.data(withJSONObject: rendererDict) else { return nil }
  return try? Renderer.fromJSON(modifiedData)
}

/// Converts one JS `VisualVariable` dict to the ArcGIS REST JSON dictionary understood by the
/// native renderer engine. Hex color strings (`#RRGGBB`/`#RRGGBBAA`) are converted to
/// `[R, G, B, A]` integer arrays as required by the REST spec.
private func buildVisualVariableJson(_ vv: [String: Any]) -> [String: Any]? {
  guard let type = vv["type"] as? String else { return nil }
  switch type {
  case "size":
    var d: [String: Any] = ["type": "sizeInfo"]
    if let field = vv["field"] as? String { d["field"] = field }
    if let expr = vv["valueExpression"] as? String { d["valueExpression"] = expr }
    if let v = (vv["minDataValue"] as? NSNumber)?.doubleValue { d["minDataValue"] = v }
    if let v = (vv["maxDataValue"] as? NSNumber)?.doubleValue { d["maxDataValue"] = v }
    if let v = (vv["minSize"] as? NSNumber)?.doubleValue { d["minSize"] = v }
    if let v = (vv["maxSize"] as? NSNumber)?.doubleValue { d["maxSize"] = v }
    if let stops = vv["stops"] as? [[String: Any]] {
      d["stops"] = stops.compactMap { s -> [String: Any]? in
        guard let value = (s["value"] as? NSNumber)?.doubleValue,
              let size = (s["size"] as? NSNumber)?.doubleValue else { return nil }
        return ["value": value, "size": size]
      }
    }
    return d
  case "color":
    var d: [String: Any] = ["type": "colorInfo"]
    if let field = vv["field"] as? String { d["field"] = field }
    if let expr = vv["valueExpression"] as? String { d["valueExpression"] = expr }
    if let stops = vv["stops"] as? [[String: Any]] {
      d["stops"] = stops.compactMap { s -> [String: Any]? in
        guard let value = (s["value"] as? NSNumber)?.doubleValue,
              let colorArr = restColor(s["color"]) else { return nil }
        return ["value": value, "color": colorArr]
      }
    }
    return d
  case "rotation":
    var d: [String: Any] = ["type": "rotationInfo"]
    if let field = vv["field"] as? String { d["field"] = field }
    if let expr = vv["valueExpression"] as? String { d["valueExpression"] = expr }
    if let rt = vv["rotationType"] as? String { d["rotationType"] = rt }
    return d
  case "opacity":
    var d: [String: Any] = ["type": "opacityInfo"]
    if let field = vv["field"] as? String { d["field"] = field }
    if let expr = vv["valueExpression"] as? String { d["valueExpression"] = expr }
    if let stops = vv["stops"] as? [[String: Any]] {
      d["stops"] = stops.compactMap { s -> [String: Any]? in
        guard let value = (s["value"] as? NSNumber)?.doubleValue,
              let opacity = (s["opacity"] as? NSNumber)?.doubleValue else { return nil }
        return ["value": value, "opacity": opacity]
      }
    }
    return d
  default:
    return nil // skip unknown visual variable types gracefully
  }
}

/// Converts a hex color string (`#RRGGBB` / `#RRGGBBAA`, alpha-last) to an
/// `[R, G, B, A]` integer array as required by the ArcGIS REST renderer JSON spec.
private func restColor(_ value: Any?) -> [Int]? {
  guard var s = (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
  if s.hasPrefix("#") { s.removeFirst() }
  guard let v = UInt64(s, radix: 16) else { return nil }
  switch s.count {
  case 6:
    return [Int((v >> 16) & 0xff), Int((v >> 8) & 0xff), Int(v & 0xff), 255]
  case 8:
    return [Int((v >> 24) & 0xff), Int((v >> 16) & 0xff), Int((v >> 8) & 0xff), Int(v & 0xff)]
  default:
    return nil
  }
}

private func rendererNumber(_ value: Any?) -> Double {
  (value as? NSNumber)?.doubleValue ?? .nan
}

/// Converts JS unique values to ArcGIS-comparable scalars (whole numbers → `Int`, else `Double`/`String`).
private func rendererValues(_ value: Any?) -> [any Sendable] {
  (value as? [Any] ?? []).map { item -> any Sendable in
    if let number = item as? NSNumber {
      let double = number.doubleValue
      return double == double.rounded() ? number.intValue : double
    }
    return String(describing: item)
  }
}

// MARK: - Labels

/// Builds a `LabelDefinition` (expression + text symbol + optional where clause) from a JS dict.
func buildLabelDefinition(_ d: [String: Any]) -> LabelDefinition {
  let expressionText = d["expression"] as? String ?? ""
  let expression: LabelExpression = (d["useArcade"] as? Bool ?? false)
    ? ArcadeLabelExpression(arcadeString: expressionText)
    : SimpleLabelExpression(simpleExpression: expressionText)
  let textSymbol = (d["symbol"] as? [String: Any]).flatMap(buildSymbol) as? TextSymbol
  let definition = LabelDefinition(labelExpression: expression, textSymbol: textSymbol)
  if let whereClause = d["whereClause"] as? String { definition.whereClause = whereClause }
  return definition
}

// MARK: - Feature reduction

/// Builds a `FeatureReduction` (currently clustering) from a JS dict.
func buildFeatureReduction(_ d: [String: Any]) -> FeatureReduction? {
  switch d["type"] as? String {
  case "cluster":
    let renderer = (d["renderer"] as? [String: Any]).flatMap(buildRenderer) ?? defaultClusterRenderer()
    let reduction = ClusteringFeatureReduction(renderer: renderer)
    if let radius = d["radius"] as? NSNumber { reduction.radius = radius.doubleValue }
    if let minSize = d["minSymbolSize"] as? NSNumber { reduction.minSymbolSize = minSize.doubleValue }
    if let maxSize = d["maxSymbolSize"] as? NSNumber { reduction.maxSymbolSize = maxSize.doubleValue }
    if let enabled = d["enabled"] as? Bool { reduction.isEnabled = enabled }
    return reduction
  default:
    return nil
  }
}

private func defaultClusterRenderer() -> Renderer {
  SimpleRenderer(symbol: SimpleMarkerSymbol(style: .circle, color: .systemBlue, size: 18))
}

// MARK: - Symbols

func buildSymbol(_ s: [String: Any]) -> Symbol? {
  switch s["type"] as? String {
  case "simple-marker":
    let marker = SimpleMarkerSymbol(
      style: markerStyle(s["style"] as? String),
      color: color(s["color"]) ?? .red,
      size: (s["size"] as? NSNumber)?.doubleValue ?? 10
    )
    marker.outline = outline(s["outline"])
    return marker
  case "simple-line":
    return lineSymbol(s)
  case "simple-fill":
    return SimpleFillSymbol(
      style: fillStyle(s["style"] as? String),
      color: color(s["color"]) ?? .red,
      outline: outline(s["outline"])
    )
  case "text":
    let textSymbol = TextSymbol(
      text: s["text"] as? String ?? "",
      color: color(s["color"]) ?? .black,
      size: (s["size"] as? NSNumber)?.doubleValue ?? 12,
      horizontalAlignment: horizontalAlignment(s["horizontalAlignment"] as? String),
      verticalAlignment: verticalAlignment(s["verticalAlignment"] as? String)
    )
    textSymbol.haloColor = color(s["haloColor"])
    if let haloWidth = s["haloWidth"] as? NSNumber { textSymbol.haloWidth = haloWidth.doubleValue }
    if let fontFamily = s["fontFamily"] as? String { textSymbol.fontFamily = fontFamily }
    return textSymbol
  case "simple-marker-scene":
    return SimpleMarkerSceneSymbol(
      style: sceneSymbolStyle(s["style"] as? String),
      color: color(s["color"]) ?? .lightGray,
      height: (s["height"] as? NSNumber)?.doubleValue ?? 100,
      width: (s["width"] as? NSNumber)?.doubleValue ?? 100,
      depth: (s["depth"] as? NSNumber)?.doubleValue ?? 100,
      anchorPosition: sceneSymbolAnchor(s["anchor"] as? String)
    )
  case "picture-marker":
    guard let urlString = s["url"] as? String, let url = URL(string: urlString) else { return nil }
    let picture = PictureMarkerSymbol(url: url)
    if let width = (s["width"] as? NSNumber)?.doubleValue { picture.width = width }
    if let height = (s["height"] as? NSNumber)?.doubleValue { picture.height = height }
    return picture
  case "picture-fill":
    guard let urlString = s["url"] as? String, let url = URL(string: urlString) else { return nil }
    let fill = PictureFillSymbol(url: url)
    if let width = (s["width"] as? NSNumber)?.doubleValue { fill.width = width }
    if let height = (s["height"] as? NSNumber)?.doubleValue { fill.height = height }
    fill.outline = outline(s["outline"])
    return fill
  case "distance-composite-scene":
    let composite = DistanceCompositeSceneSymbol()
    let rangeList = s["ranges"] as? [[String: Any]] ?? []
    for rd in rangeList {
      guard let sym = (rd["symbol"] as? [String: Any]).flatMap(buildSymbol) else { continue }
      let range = DistanceSymbolRange(
        symbol: sym,
        minDistance: (rd["minDistance"] as? NSNumber)?.doubleValue,
        maxDistance: (rd["maxDistance"] as? NSNumber)?.doubleValue
      )
      composite.addRange(range)
    }
    return composite
  case "composite":
    let symbolDicts = s["symbols"] as? [[String: Any]] ?? []
    let builtSymbols = symbolDicts.compactMap(buildSymbol)
    return CompositeSymbol(symbols: builtSymbols)
  default:
    return nil
  }
}

private func sceneSymbolStyle(_ value: String?) -> SimpleMarkerSceneSymbol.Style {
  switch value {
  case "cone": return .cone
  case "cube": return .cube
  case "cylinder": return .cylinder
  case "diamond": return .diamond
  case "tetrahedron": return .tetrahedron
  default: return .sphere
  }
}

private func sceneSymbolAnchor(_ value: String?) -> MarkerSceneSymbol.AnchorPosition {
  switch value {
  case "center": return .center
  case "top": return .top
  case "origin": return .origin
  default: return .bottom
  }
}

private func horizontalAlignment(_ value: String?) -> TextSymbol.HorizontalAlignment {
  switch value {
  case "left": return .left
  case "right": return .right
  case "justify": return .justify
  default: return .center
  }
}

private func verticalAlignment(_ value: String?) -> TextSymbol.VerticalAlignment {
  switch value {
  case "top": return .top
  case "bottom": return .bottom
  case "baseline": return .baseline
  default: return .middle
  }
}

private func lineSymbol(_ s: [String: Any]) -> SimpleLineSymbol {
  SimpleLineSymbol(
    style: lineStyle(s["style"] as? String),
    color: color(s["color"]) ?? .blue,
    width: (s["width"] as? NSNumber)?.doubleValue ?? 1
  )
}

private func outline(_ value: Any?) -> SimpleLineSymbol? {
  (value as? [String: Any]).map(lineSymbol)
}

private func color(_ value: Any?) -> UIColor? {
  (value as? String).flatMap(UIColor.init(hex:))
}

private func markerStyle(_ style: String?) -> SimpleMarkerSymbol.Style {
  switch style {
  case "cross": return .cross
  case "diamond": return .diamond
  case "square": return .square
  case "triangle": return .triangle
  case "x": return .x
  default: return .circle
  }
}

private func lineStyle(_ style: String?) -> SimpleLineSymbol.Style {
  switch style {
  case "dash": return .dash
  case "dot": return .dot
  case "dash-dot": return .dashDot
  case "dash-dot-dot": return .dashDotDot
  case "none": return .noLine
  default: return .solid
  }
}

private func fillStyle(_ style: String?) -> SimpleFillSymbol.Style {
  switch style {
  case "none": return .noFill
  case "horizontal": return .horizontal
  case "vertical": return .vertical
  case "cross": return .cross
  case "diagonal-cross": return .diagonalCross
  case "forward-diagonal": return .forwardDiagonal
  case "backward-diagonal": return .backwardDiagonal
  default: return .solid
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard let value = UInt64(s, radix: 16) else { return nil }
    let r, g, b, a: CGFloat
    switch s.count {
    case 6:
      r = CGFloat((value & 0xff0000) >> 16) / 255
      g = CGFloat((value & 0x00ff00) >> 8) / 255
      b = CGFloat(value & 0x0000ff) / 255
      a = 1
    case 8:
      r = CGFloat((value & 0xff00_0000) >> 24) / 255
      g = CGFloat((value & 0x00ff_0000) >> 16) / 255
      b = CGFloat((value & 0x0000_ff00) >> 8) / 255
      a = CGFloat(value & 0x0000_00ff) / 255
    default:
      return nil
    }
    self.init(red: r, green: g, blue: b, alpha: a)
  }
}
