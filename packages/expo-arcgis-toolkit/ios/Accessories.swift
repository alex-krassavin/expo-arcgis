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

/// The Toolkit's `Compass` over a `<MapView>` or `<SceneView>`. Tapping it turns the view back to
/// north.
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
      sized(Compass(rotation: view.viewpoint?.rotation, mapViewProxy: proxy))
    } else if let proxy = view.sceneViewProxy {
      // A scene turns back to north by its camera: same position, pitch and roll, heading 0.
      sized(
        Compass(rotation: view.viewpoint?.rotation) {
          guard let camera = view.camera else { return }
          let north = Camera(
            location: camera.location, heading: 0, pitch: camera.pitch, roll: camera.roll)
          Task { _ = await proxy.setViewpointCamera(north, duration: 0.5) }
        }
      )
    }
  }

  private func sized(_ compass: Compass) -> some View {
    let compass = compass.autoHideDisabled(!accessory.autoHide)
    return Group {
      if let size = accessory.size {
        compass.compassSize(size: size)
      } else {
        compass
      }
    }
    .padding()
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
    // A scale bar measures a map: a scene has no units per point.
    if view.mapViewProxy != nil {
      scalebar
    }
  }

  private var scalebar: some View {
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

/// The Toolkit's `OverviewMap` over a `<MapView>` or `<SceneView>`: a small map that shows where the
/// view's visible area (a map) or its center (a scene) lies.
final class OverviewMapAccessory: SharedObject, GeoViewAccessory, ObservableObject {
  @Published private(set) var alignment: Alignment = .topTrailing
  @Published private(set) var scaleFactor: Double = 25
  @Published private(set) var width: CGFloat = 200
  @Published private(set) var height: CGFloat = 132

  func update(_ props: [String: Any]) {
    alignment = accessoryAlignment(props["alignment"], default: .topTrailing)
    scaleFactor = (props["scaleFactor"] as? NSNumber)?.doubleValue ?? 25
    width = (props["width"] as? NSNumber).map { CGFloat($0.doubleValue) } ?? 200
    height = (props["height"] as? NSNumber).map { CGFloat($0.doubleValue) } ?? 132
  }

  func body(in view: GeoViewState) -> AnyView {
    AnyView(OverviewMapAccessoryView(accessory: self, view: view))
  }
}

private struct OverviewMapAccessoryView: View {
  @ObservedObject var accessory: OverviewMapAccessory
  @ObservedObject var view: GeoViewState

  var body: some View {
    Group {
      if view.mapViewProxy != nil {
        OverviewMap.forMapView(with: view.viewpoint, visibleArea: view.visibleArea)
          .scaleFactor(accessory.scaleFactor)
      } else {
        OverviewMap.forSceneView(with: view.viewpoint)
          .scaleFactor(accessory.scaleFactor)
      }
    }
    .frame(width: accessory.width, height: accessory.height)
    .padding()
  }
}

/// The Toolkit's `LocationButton` over a `<MapView>`: it starts and stops the map's location display
/// and cycles through its auto-pan modes.
final class LocationButtonAccessory: SharedObject, GeoViewAccessory, ObservableObject {
  @Published private(set) var alignment: Alignment = .topLeading
  /// Nil keeps the Toolkit's modes.
  @Published private(set) var autoPanModes: [LocationDisplay.AutoPanMode]?

  func update(_ props: [String: Any]) {
    alignment = accessoryAlignment(props["alignment"], default: .topLeading)
    autoPanModes = (props["autoPanModes"] as? [String])?.map(autoPanMode)
  }

  func body(in view: GeoViewState) -> AnyView {
    AnyView(LocationButtonAccessoryView(accessory: self, view: view))
  }
}

private struct LocationButtonAccessoryView: View {
  @ObservedObject var accessory: LocationButtonAccessory
  @ObservedObject var view: GeoViewState

  var body: some View {
    // A `<SceneView>` has no location display.
    if let locationDisplay = view.locationDisplay {
      Group {
        if let modes = accessory.autoPanModes {
          LocationButton(locationDisplay: locationDisplay).autoPanModes(modes)
        } else {
          LocationButton(locationDisplay: locationDisplay)
        }
      }
      .padding()
    }
  }
}

private func autoPanMode(_ value: String) -> LocationDisplay.AutoPanMode {
  switch value {
  case "recenter": return .recenter
  case "navigation": return .navigation
  case "compassNavigation": return .compassNavigation
  default: return .off
  }
}
