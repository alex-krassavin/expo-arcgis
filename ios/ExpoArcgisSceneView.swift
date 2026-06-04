import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// Holds the externally-provided ArcGIS `Scene` and bridges events to JS.
final class SceneViewModel: ObservableObject {
  // `ArcGIS.Scene` qualified to avoid collision with `SwiftUI.Scene` (this file imports SwiftUI).
  @Published private(set) var scene: ArcGIS.Scene?
  @Published private(set) var graphicsOverlays: [GraphicsOverlay] = []

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?
  var onTap: ((_ latitude: Double, _ longitude: Double, _ screenX: Double, _ screenY: Double) -> Void)?

  func setScene(_ scene: ArcGIS.Scene?) {
    self.scene = scene
  }

  func setGraphicsOverlays(_ overlays: [GraphicsOverlay]) {
    graphicsOverlays = overlays
  }
}

/// SwiftUI host for the ArcGIS `SceneView`. Loads the scene, reports the result, and forwards taps.
struct ExpoArcgisSceneContainer: View {
  @ObservedObject var model: SceneViewModel

  var body: some View {
    if let scene = model.scene {
      SceneView(scene: scene, graphicsOverlays: model.graphicsOverlays)
        .onSingleTapGesture { screenPoint, scenePoint in
          // SceneView delivers an optional `Point` (a 3D tap can miss the globe).
          guard let scenePoint else { return }
          let wgs84 = GeometryEngine.project(scenePoint, into: .wgs84) ?? scenePoint
          model.onTap?(wgs84.y, wgs84.x, Double(screenPoint.x), Double(screenPoint.y))
        }
        .task(id: ObjectIdentifier(scene)) {
          do {
            try await scene.load()
            model.onLoaded?()
          } catch is CancellationError {
            // Superseded by a newer scene; ignore.
          } catch {
            model.onLoadError?(error.localizedDescription)
          }
        }
    }
  }
}

/// Declarative 3D scene host. Renders the `SceneRef` passed as the `scene` view prop.
class ExpoArcgisSceneView: ExpoView {
  private let onSceneLoaded = EventDispatcher()
  private let onSceneLoadError = EventDispatcher()
  private let onTap = EventDispatcher()

  private let model = SceneViewModel()
  private var hostingController: UIHostingController<ExpoArcgisSceneContainer>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    model.onLoaded = { [weak self] in
      self?.onSceneLoaded(["spatialReferenceWkid": NSNull()])
    }
    model.onLoadError = { [weak self] message in
      self?.onSceneLoadError(["message": message])
    }
    model.onTap = { [weak self] latitude, longitude, screenX, screenY in
      self?.onTap([
        "mapPoint": ["latitude": latitude, "longitude": longitude],
        "screenPoint": ["x": screenX, "y": screenY],
      ])
    }

    let hostingController = UIHostingController(rootView: ExpoArcgisSceneContainer(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  /// Receives the native scene (by reference) from the `<Scene>` SharedObject.
  func setScene(_ ref: SceneRef?) {
    model.setScene(ref?.scene)
  }

  func setGraphicsOverlays(_ refs: [GraphicsOverlayRef]) {
    model.setGraphicsOverlays(refs.map { $0.overlay })
  }
}
