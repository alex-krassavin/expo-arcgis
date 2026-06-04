import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// Holds the externally-provided ArcGIS `Map` + graphics overlay and bridges events to JS.
final class MapViewModel: ObservableObject {
  @Published private(set) var map: Map?
  @Published private(set) var graphicsOverlays: [GraphicsOverlay] = []

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?
  var onTap: ((_ latitude: Double, _ longitude: Double, _ screenX: Double, _ screenY: Double) -> Void)?

  func setMap(_ map: Map?) {
    self.map = map
  }

  func setGraphicsOverlays(_ overlays: [GraphicsOverlay]) {
    graphicsOverlays = overlays
  }
}

/// SwiftUI host for the ArcGIS `MapView`. Loads the map, reports the result, and forwards taps.
struct ExpoArcgisMapContainer: View {
  @ObservedObject var model: MapViewModel

  var body: some View {
    if let map = model.map {
      MapView(map: map, graphicsOverlays: model.graphicsOverlays)
        .onSingleTapGesture { screenPoint, mapPoint in
          // MapView delivers a non-optional `Point` (a 2D tap always maps to the surface).
          // `GeometryEngine.project` is generic, so it returns `Point?` for a `Point` input.
          let wgs84 = GeometryEngine.project(mapPoint, into: .wgs84) ?? mapPoint
          model.onTap?(wgs84.y, wgs84.x, Double(screenPoint.x), Double(screenPoint.y))
        }
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
    }
  }
}

/// Declarative 2D map host. Renders the `MapRef` passed as the `map` view prop.
class ExpoArcgisMapView: ExpoView {
  private let onMapLoaded = EventDispatcher()
  private let onMapLoadError = EventDispatcher()
  private let onTap = EventDispatcher()

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

    let hostingController = UIHostingController(rootView: ExpoArcgisMapContainer(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  /// Receives the native map (by reference) from the `<Map>` SharedObject.
  func setMap(_ ref: MapRef?) {
    model.setMap(ref?.map)
  }

  /// Receives the graphics overlays declared as `<GraphicsOverlay>` children of the `<MapView>`.
  func setGraphicsOverlays(_ refs: [GraphicsOverlayRef]) {
    model.setGraphicsOverlays(refs.map { $0.overlay })
  }
}
