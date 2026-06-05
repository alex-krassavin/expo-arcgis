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
func buildRenderer(_ r: [String: Any]) -> Renderer? {
  switch r["type"] as? String {
  case "simple":
    return (r["symbol"] as? [String: Any]).flatMap(buildSymbol).map(SimpleRenderer.init(symbol:))
  case "unique-value":
    let values = (r["uniqueValues"] as? [[String: Any]] ?? []).compactMap { uv -> UniqueValue? in
      guard let symbol = (uv["symbol"] as? [String: Any]).flatMap(buildSymbol) else { return nil }
      return UniqueValue(
        label: uv["label"] as? String ?? "", symbol: symbol, values: rendererValues(uv["values"])
      )
    }
    return UniqueValueRenderer(
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
    let renderer = ClassBreaksRenderer(fieldName: r["field"] as? String ?? "", classBreaks: breaks)
    renderer.defaultSymbol = (r["defaultSymbol"] as? [String: Any]).flatMap(buildSymbol)
    return renderer
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
  default:
    return nil
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
