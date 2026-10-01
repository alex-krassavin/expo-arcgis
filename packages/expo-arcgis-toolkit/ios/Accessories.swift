import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The JS `AccessoryAlignment`, as SwiftUI places it.
func accessoryAlignment(_ value: Any?, default fallback: Alignment) -> Alignment {
  switch value as? String {
  case "topLeading": return .topLeading
  case "top": return .top
  case "topTrailing": return .topTrailing
  case "leading": return .leading
  case "center": return .center
  case "trailing": return .trailing
  case "bottomLeading": return .bottomLeading
  case "bottom": return .bottom
  case "bottomTrailing": return .bottomTrailing
  default: return fallback
  }
}

/// The Toolkit's `Compass` over a `<MapView>`. Tapping it turns the map back to north.
final class CompassAccessory: SharedObject, GeoViewAccessory, ObservableObject {
  @Published private(set) var alignment: Alignment = .topTrailing
  @Published private(set) var autoHide = true
  /// Nil keeps the Toolkit's size.
  @Published private(set) var size: CGFloat?

  func update(_ props: [String: Any]) {
    alignment = accessoryAlignment(props["alignment"], default: .topTrailing)
    autoHide = props["autoHide"] as? Bool ?? true
    size = (props["size"] as? NSNumber).map { CGFloat($0.doubleValue) }
  }

  func body(in view: GeoViewState) -> AnyView {
    AnyView(CompassAccessoryView(accessory: self, view: view))
  }
}

private struct CompassAccessoryView: View {
  @ObservedObject var accessory: CompassAccessory
  @ObservedObject var view: GeoViewState

  var body: some View {
    if let proxy = view.mapViewProxy {
      let compass = Compass(rotation: view.viewpoint?.rotation, mapViewProxy: proxy)
        .autoHideDisabled(!accessory.autoHide)
      Group {
        if let size = accessory.size {
          compass.compassSize(size: size)
        } else {
          compass
        }
      }
      .padding()
    }
  }
}

/// The Toolkit's `Scalebar` over a `<MapView>`.
final class ScalebarAccessory: SharedObject, GeoViewAccessory, ObservableObject {
  @Published private(set) var alignment: Alignment = .bottomLeading
  @Published private(set) var maxWidth: Double = 175
  @Published private(set) var style: Scalebar.Style = .alternatingBar
  /// Nil follows the device's measurement system, as the Toolkit does.
  @Published private(set) var units: Scalebar.Units?
  @Published private(set) var minScale: Double = 0
  @Published private(set) var useGeodeticCalculations = true

  func update(_ props: [String: Any]) {
    alignment = accessoryAlignment(props["alignment"], default: .bottomLeading)
    maxWidth = (props["maxWidth"] as? NSNumber)?.doubleValue ?? 175
    style = scalebarStyle(props["style"] as? String)
    units = (props["units"] as? String).map { $0 == "imperial" ? .imperial : .metric }
    minScale = (props["minScale"] as? NSNumber)?.doubleValue ?? 0
    useGeodeticCalculations = props["useGeodeticCalculations"] as? Bool ?? true
  }

  func body(in view: GeoViewState) -> AnyView {
    AnyView(ScalebarAccessoryView(accessory: self, view: view))
  }
}

private struct ScalebarAccessoryView: View {
  @ObservedObject var accessory: ScalebarAccessory
  @ObservedObject var view: GeoViewState

  var body: some View {
    Scalebar(
      maxWidth: accessory.maxWidth,
      minScale: accessory.minScale,
      spatialReference: view.spatialReference,
      style: accessory.style,
      units: accessory.units ?? (Locale.current.measurementSystem == .metric ? .metric : .imperial),
      unitsPerPoint: view.unitsPerPoint,
      useGeodeticCalculations: accessory.useGeodeticCalculations,
      viewpoint: view.viewpoint
    )
    .padding()
  }
}

private func scalebarStyle(_ value: String?) -> Scalebar.Style {
  switch value {
  case "bar": return .bar
  case "dualUnitLine": return .dualUnitLine
  case "graduatedLine": return .graduatedLine
  case "line": return .line
  default: return .alternatingBar
  }
}
