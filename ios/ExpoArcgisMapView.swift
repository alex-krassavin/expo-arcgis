import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// Holds the externally-provided ArcGIS `Map` + graphics overlay and bridges events to JS.
final class MapViewModel: ObservableObject {
  @Published private(set) var map: Map?
  @Published private(set) var graphicsOverlays: [GraphicsOverlay] = []
  @Published private(set) var viewpoint: Viewpoint?
  /// Bumped on each viewpoint change so the SwiftUI `.task(id:)` re-runs and re-animates.
  @Published private(set) var viewpointVersion = 0
  let locationDisplay = LocationDisplay(dataSource: SystemLocationDataSource())
  @Published private(set) var locationEnabled = false
  /// Bumped on each location config change so the start `.task(id:)` re-runs (e.g. after a source swap).
  @Published private(set) var locationVersion = 0
  @Published private(set) var geometryEditor: GeometryEditor?
  /// The view proxy captured from `MapViewReader`, used for `identify` (not published).
  var proxy: MapViewProxy?

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?
  var onTap: ((_ latitude: Double, _ longitude: Double, _ screenX: Double, _ screenY: Double) -> Void)?
  var onLocationChange: ((Location) -> Void)?

  func setMap(_ map: Map?) {
    self.map = map
  }

  func setGraphicsOverlays(_ overlays: [GraphicsOverlay]) {
    graphicsOverlays = overlays
  }

  func setViewpoint(_ viewpoint: Viewpoint) {
    self.viewpoint = viewpoint
    viewpointVersion += 1
  }

  func setLocationDisplay(
    enabled: Bool, autoPanMode: LocationDisplay.AutoPanMode, showsLocation: Bool,
    wanderExtentFactor: Float?, dataSource: LocationDataSource?
  ) {
    locationDisplay.autoPanMode = autoPanMode
    locationDisplay.showsLocation = showsLocation
    if let wanderExtentFactor { locationDisplay.wanderExtentFactor = wanderExtentFactor }
    if let dataSource { locationDisplay.dataSource = dataSource }
    locationEnabled = enabled
    locationVersion += 1
  }

  func setGeometryEditor(_ editor: GeometryEditor?) {
    geometryEditor = editor
  }
}

/// SwiftUI host for the ArcGIS `MapView`. Loads the map, reports the result, and forwards taps.
struct ExpoArcgisMapContainer: View {
  @ObservedObject var model: MapViewModel

  var body: some View {
    if let map = model.map {
      MapViewReader { proxy in
        MapView(map: map, graphicsOverlays: model.graphicsOverlays)
          // `locationDisplay(_:)` / `geometryEditor(_:)` return `MapView`, so they must precede
          // the SwiftUI modifiers below.
          .locationDisplay(model.locationDisplay)
          .geometryEditor(model.geometryEditor)
          .onSingleTapGesture { screenPoint, mapPoint in
            // MapView delivers a non-optional `Point` (a 2D tap always maps to the surface).
            // `GeometryEngine.project` is generic, so it returns `Point?` for a `Point` input.
            let wgs84 = GeometryEngine.project(mapPoint, into: .wgs84) ?? mapPoint
            model.onTap?(wgs84.y, wgs84.x, Double(screenPoint.x), Double(screenPoint.y))
          }
          .onAppear { model.proxy = proxy }
          .task(id: ObjectIdentifier(map)) {
            do {
              try await map.load()
              model.onLoaded?()
            } catch is CancellationError {
              // Superseded by a newer map; ignore.
            } catch {
              model.onLoadError?(error.localizedDescription)
            }
          }
          .task(id: model.viewpointVersion) {
            guard let viewpoint = model.viewpoint else { return }
            _ = await proxy.setViewpoint(viewpoint, duration: 0.5)
          }
          .task(id: model.locationVersion) {
            if model.locationEnabled {
              try? await model.locationDisplay.dataSource.start()
            } else {
              await model.locationDisplay.dataSource.stop()
            }
          }
          .task {
            for await location in model.locationDisplay.$location {
              if let location { model.onLocationChange?(location) }
            }
          }
      }
    }
  }
}

/// Declarative 2D map host. Renders the `MapRef` passed as the `map` view prop.
class ExpoArcgisMapView: ExpoView {
  private let onMapLoaded = EventDispatcher()
  private let onMapLoadError = EventDispatcher()
  private let onTap = EventDispatcher()
  private let onLocationChange = EventDispatcher()

  private let model = MapViewModel()
  private var hostingController: UIHostingController<ExpoArcgisMapContainer>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    model.onLoaded = { [weak self] in
      self?.onMapLoaded(["spatialReferenceWkid": NSNull()])
    }
    model.onLoadError = { [weak self] message in
      self?.onMapLoadError(["message": message])
    }
    model.onTap = { [weak self] latitude, longitude, screenX, screenY in
      self?.onTap([
        "mapPoint": ["latitude": latitude, "longitude": longitude],
        "screenPoint": ["x": screenX, "y": screenY],
      ])
    }
    model.onLocationChange = { [weak self] location in
      self?.onLocationChange(serializeLocation(location))
    }

    let hostingController = UIHostingController(rootView: ExpoArcgisMapContainer(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  /// Retries loading the map (Loadable pattern) — useful after a network outage. Re-emits the result.
  func retryLoad() async throws {
    guard let map = model.map else { return }
    do {
      try await map.retryLoad()
      onMapLoaded(["spatialReferenceWkid": NSNull()])
    } catch {
      onMapLoadError(["message": error.localizedDescription])
    }
  }

  /// Receives the native map (by reference) from the `<Map>` SharedObject.
  func setMap(_ ref: MapRef?) {
    model.setMap(ref?.map)
    // The map may be replaced asynchronously (e.g. once a mobile map package loads) — re-render then.
    ref?.onMapChanged = { [weak self] map in self?.model.setMap(map) }
  }

  /// Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<MapView>`.
  func setGraphicsOverlays(_ refs: [GraphicsOverlayRef]) {
    model.setGraphicsOverlays(refs.map { $0.overlay })
  }

  /// Animates the view to a runtime viewpoint sent from JS.
  func setViewpoint(_ vp: [String: Any]?) {
    guard let vp,
          let lat = (vp["latitude"] as? NSNumber)?.doubleValue,
          let lon = (vp["longitude"] as? NSNumber)?.doubleValue,
          let scale = (vp["scale"] as? NSNumber)?.doubleValue
    else { return }
    model.setViewpoint(Viewpoint(latitude: lat, longitude: lon, scale: scale))
  }

  /// Enables/configures the device location display from JS (nil disables it).
  func setLocationDisplay(_ config: [String: Any]?) {
    if let config {
      model.setLocationDisplay(
        enabled: true,
        autoPanMode: autoPanMode(config["autoPanMode"] as? String),
        showsLocation: config["showLocation"] as? Bool ?? true,
        wanderExtentFactor: (config["wanderExtentFactor"] as? NSNumber)?.floatValue,
        dataSource: locationDataSource(config["source"])
      )
    } else {
      model.setLocationDisplay(
        enabled: false, autoPanMode: .off, showsLocation: false, wanderExtentFactor: nil, dataSource: nil
      )
    }
  }

  /// Resolves the JS `source` to a data source. Returns nil to keep the current source unchanged.
  private func locationDataSource(_ source: Any?) -> LocationDataSource? {
    if let source = source as? [String: Any], source["type"] as? String == "simulated",
       let route = (source["route"] as? [String: Any]).flatMap(geometryFromDict) as? Polyline {
      return simulatedSource(route: route, speed: (source["speed"] as? NSNumber)?.doubleValue ?? 10)
    }
    // 'system' / unspecified: swap back only if currently simulated, otherwise keep the source.
    return model.locationDisplay.dataSource is SimulatedLocationDataSource ? SystemLocationDataSource() : nil
  }

  /// Builds a simulated source that walks the route's vertices as device locations.
  private func simulatedSource(route: Polyline, speed: Double) -> SimulatedLocationDataSource {
    let source = SimulatedLocationDataSource()
    source.addSimulatedLocations(
      route.parts.flatMap { $0.points }.map {
        Location(position: $0, horizontalAccuracy: 0, verticalAccuracy: 0, speed: speed, course: 0)
      }
    )
    return source
  }

  /// Binds an interactive GeometryEditor (by reference) for sketching; nil clears it.
  func setGeometryEditor(_ ref: GeometryEditorRef?) {
    model.setGeometryEditor(ref?.editor)
  }

  /// Identifies the features under a screen point (one result per layer with hits).
  func identify(_ screenPoint: [String: Any], _ options: [String: Any]?) async throws -> [[String: Any]] {
    guard let proxy = model.proxy else { return [] }
    let point = CGPoint(
      x: (screenPoint["x"] as? NSNumber)?.doubleValue ?? 0,
      y: (screenPoint["y"] as? NSNumber)?.doubleValue ?? 0
    )
    let tolerance = (options?["tolerance"] as? NSNumber)?.doubleValue ?? 12
    let maxResults = (options?["maxResults"] as? NSNumber)?.intValue ?? 1
    let results = try await proxy.identifyLayers(
      screenPoint: point, tolerance: tolerance, maximumResultsPerLayer: maxResults
    )
    return results.map(serializeIdentifyResult)
  }
}

/// Serializes a device-location fix to the `onLocationChange` JS payload.
func serializeLocation(_ location: Location) -> [String: Any] {
  var position: [String: Any] = ["latitude": location.position.y, "longitude": location.position.x]
  if let z = location.position.z { position["z"] = z }
  return [
    "position": position,
    "horizontalAccuracy": location.horizontalAccuracy,
    "verticalAccuracy": location.verticalAccuracy,
    "course": location.course,
    "speed": location.speed,
    "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
  ]
}

/// Maps the JS auto-pan union to the native `LocationDisplay.AutoPanMode`.
func autoPanMode(_ mode: String?) -> LocationDisplay.AutoPanMode {
  switch mode {
  case "recenter": return .recenter
  case "navigation": return .navigation
  case "compassNavigation": return .compassNavigation
  default: return .off
  }
}
