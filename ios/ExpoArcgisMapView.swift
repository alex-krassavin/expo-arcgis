import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// Holds the externally-provided ArcGIS `Map` and bridges load results to JS events.
final class MapViewModel: ObservableObject {
  @Published private(set) var map: Map?

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?

  func setMap(_ map: Map?) {
    self.map = map
  }
}

/// SwiftUI host for the ArcGIS `MapView`. Loads the map and reports the result once per map.
struct ExpoArcgisMapContainer: View {
  @ObservedObject var model: MapViewModel

  var body: some View {
    if let map = model.map {
      MapView(map: map)
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

/// Declarative 2D map host. Renders the `ArcGISMapRef` passed as the `map` view prop.
class ExpoArcgisMapView: ExpoView {
  private let onMapLoaded = EventDispatcher()
  private let onMapLoadError = EventDispatcher()

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

    let hostingController = UIHostingController(rootView: ExpoArcgisMapContainer(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  /// Receives the native map (by reference) from the `<Map>` SharedObject.
  func setMap(_ ref: ArcGISMapRef?) {
    model.setMap(ref?.map)
  }
}
