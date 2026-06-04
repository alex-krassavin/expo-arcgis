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

/// SharedObject wrapping a native `Graphic` — a point with a simple marker symbol in v1.
public final class GraphicRef: SharedObject {
  let graphic = Graphic()

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "point":
        if let p = value as? [String: Any],
           let lat = (p["latitude"] as? NSNumber)?.doubleValue,
           let lon = (p["longitude"] as? NSNumber)?.doubleValue {
          graphic.geometry = Point(latitude: lat, longitude: lon)
        }
      case "symbol":
        if let s = value as? [String: Any] {
          graphic.symbol = buildMarkerSymbol(s)
        }
      default:
        break
      }
    }
  }
}

func buildMarkerSymbol(_ s: [String: Any]) -> SimpleMarkerSymbol {
  let color = (s["color"] as? String).flatMap(UIColor.init(hex:)) ?? .red
  let size = (s["size"] as? NSNumber)?.doubleValue ?? 10
  return SimpleMarkerSymbol(style: markerStyle(s["style"] as? String), color: color, size: size)
}

func markerStyle(_ style: String?) -> SimpleMarkerSymbol.Style {
  switch style {
  case "square": return .square
  case "cross": return .cross
  case "diamond": return .diamond
  case "triangle": return .triangle
  case "x": return .x
  default: return .circle
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
