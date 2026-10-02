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

/// The Toolkit's `FloorFilter` over a `<MapView>` or `<SceneView>` showing floor-aware data: it picks
/// a site, a facility and a level, and shows only that level's features. Choosing a site or facility
/// moves the view to it. Each selection is sent to JS (`selectionChange`).
final class FloorFilterAccessory: SharedObject, GeoViewAccessory, ObservableObject {
  @Published private(set) var alignment: Alignment = .bottomLeading
  @Published private(set) var automaticSelectionMode: FloorFilterAutomaticSelectionMode = .always
  @Published private(set) var automaticSingleSiteSelectionDisabled = false
  /// The Toolkit's own width when nil.
  @Published private(set) var levelSelectorWidth: CGFloat?

  func update(_ props: [String: Any]) {
    alignment = accessoryAlignment(props["alignment"], default: .bottomLeading)
    automaticSelectionMode = floorFilterAutomaticSelectionMode(props["automaticSelectionMode"] as? String)
    automaticSingleSiteSelectionDisabled = props["automaticSingleSiteSelectionDisabled"] as? Bool ?? false
    levelSelectorWidth = (props["levelSelectorWidth"] as? NSNumber).map { CGFloat($0.doubleValue) }
  }

  func body(in view: GeoViewState) -> AnyView {
    AnyView(FloorFilterAccessoryView(accessory: self, view: view))
  }

  fileprivate func selectionChanged(_ selection: FloorFilterSelection?) {
    emit(event: "selectionChange", arguments: floorFilterSelectionPayload(selection))
  }
}

private struct FloorFilterAccessoryView: View {
  @ObservedObject var accessory: FloorFilterAccessory
  @ObservedObject var view: GeoViewState
  /// The view's map or scene's floor manager, once the map or scene has loaded.
  @State private var floorManager: FloorManager?
  @State private var selection: FloorFilterSelection?

  var body: some View {
    // A ZStack, not a Group: a Group's modifiers go to its children, so with no floor manager yet
    // there would be no child to run the `.task` that loads it.
    ZStack {
      if let floorManager {
        floorFilter(floorManager)
          .padding()
          .onChange(of: selection) { accessory.selectionChanged(selection) }
      }
    }
    .task(id: geoModelID) {
      // A map or scene has a floor manager only once loaded, and only with floor-aware data.
      let geoModel: GeoModel? = view.map ?? view.scene
      try? await geoModel?.load()
      floorManager = geoModel?.floorManager
    }
  }

  private func floorFilter(_ floorManager: FloorManager) -> FloorFilter {
    let floorFilter = FloorFilter(
      floorManager: floorManager,
      alignment: accessory.alignment,
      automaticSelectionMode: accessory.automaticSelectionMode,
      viewpoint: viewpoint,
      isNavigating: Binding(get: { view.isNavigating }, set: { _ in }),
      selection: $selection
    )
    .automaticSingleSiteSelectionDisabled(accessory.automaticSingleSiteSelectionDisabled)
    guard let width = accessory.levelSelectorWidth else { return floorFilter }
    return floorFilter.levelSelectorWidth(width)
  }

  private var geoModelID: ObjectIdentifier? {
    let geoModel: GeoModel? = view.map ?? view.scene
    return geoModel.map { ObjectIdentifier($0) }
  }

  /// The view's viewpoint: the floor filter reads it to select by what's in view, and sets it to
  /// move the view to a site or facility.
  private var viewpoint: Binding<Viewpoint?> {
    Binding(
      get: { view.viewpoint },
      set: { viewpoint in
        guard let viewpoint else { return }
        Task {
          if let proxy = view.mapViewProxy {
            await proxy.setViewpoint(viewpoint, duration: 0.5)
          } else if let proxy = view.sceneViewProxy {
            await proxy.setViewpoint(viewpoint, duration: 0.5)
          }
        }
      }
    )
  }
}

private func floorFilterAutomaticSelectionMode(_ value: String?) -> FloorFilterAutomaticSelectionMode {
  switch value {
  case "alwaysNotClearing": return .alwaysNotClearing
  case "never": return .never
  default: return .always
  }
}

/// A floor filter selection for JS: the selected site, and its facility and level when selected.
private func floorFilterSelectionPayload(_ selection: FloorFilterSelection?) -> [String: Any] {
  func site(_ site: FloorSite?) -> [String: Any]? {
    site.map { ["id": $0.id, "name": $0.name] }
  }
  func facility(_ facility: FloorFacility?) -> [String: Any]? {
    facility.map { ["id": $0.id, "name": $0.name] }
  }
  switch selection {
  case .site(let selected):
    return ["site": site(selected) as Any]
  case .facility(let selected):
    return ["site": site(selected.site) as Any, "facility": facility(selected) as Any]
  case .level(let level):
    return [
      "site": site(level.facility?.site) as Any,
      "facility": facility(level.facility) as Any,
      "level": [
        "id": level.id, "longName": level.longName, "shortName": level.shortName,
        "verticalOrder": level.verticalOrder,
      ],
    ]
  case nil:
    return [:]
  }
}
