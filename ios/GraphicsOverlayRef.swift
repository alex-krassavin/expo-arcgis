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
}

/// SharedObject wrapping a native `Graphic` — a point, polyline, or polygon with a simple symbol.
public final class GraphicRef: SharedObject {
  let graphic = Graphic()

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "geometry":
        graphic.geometry = (value as? [String: Any]).flatMap(buildGeometry)
      case "symbol":
        graphic.symbol = (value as? [String: Any]).flatMap(buildSymbol)
      default:
        break
      }
    }
  }
}

// MARK: - Geometry

func buildGeometry(_ g: [String: Any]) -> Geometry? {
  let sr = spatialReference(from: g["spatialReference"])
  switch g["type"] as? String {
  case "point":
    return Point(x: number(g["x"]), y: number(g["y"]), spatialReference: sr)
  case "polyline":
    return Polyline(points: vertices(g["points"], spatialReference: sr))
  case "polygon":
    return Polygon(points: vertices(g["points"], spatialReference: sr))
  default:
    return nil
  }
}

private func vertices(_ value: Any?, spatialReference sr: SpatialReference) -> [Point] {
  guard let array = value as? [[String: Any]] else { return [] }
  return array.map { Point(x: number($0["x"]), y: number($0["y"]), spatialReference: sr) }
}

/// Only WGS84 and Web Mercator are mapped in v1; any other WKID falls back to WGS84.
private func spatialReference(from value: Any?) -> SpatialReference {
  switch (value as? NSNumber)?.intValue {
  case 3857, 102100: return .webMercator
  default: return .wgs84
  }
}

private func number(_ value: Any?) -> Double {
  (value as? NSNumber)?.doubleValue ?? 0
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
