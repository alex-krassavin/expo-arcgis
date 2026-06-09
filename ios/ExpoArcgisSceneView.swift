import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// Holds the externally-provided ArcGIS `Scene` and bridges events to JS.
final class SceneViewModel: ObservableObject {
  // `ArcGIS.Scene` qualified to avoid collision with `SwiftUI.Scene` (this file imports SwiftUI).
  @Published private(set) var scene: ArcGIS.Scene?
  @Published private(set) var graphicsOverlays: [GraphicsOverlay] = []
  @Published private(set) var analysisOverlays: [AnalysisOverlay] = []
  @Published private(set) var camera: Camera?
  /// Bumped on each camera change so the SwiftUI `.task(id:)` re-runs and re-animates.
  @Published private(set) var cameraVersion = 0
  @Published private(set) var sunLighting: SceneView.SunLighting = .off
  @Published private(set) var atmosphereEffect: SceneView.AtmosphereEffect = .horizonOnly
  @Published private(set) var sunDate = Date(timeIntervalSince1970: 1_372_683_600)
  /// The view proxy captured from `SceneViewReader`, used for `identify` (not published).
  var proxy: SceneViewProxy?

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?
  var onTap: ((_ latitude: Double, _ longitude: Double, _ screenX: Double, _ screenY: Double) -> Void)?

  func setScene(_ scene: ArcGIS.Scene?) {
    self.scene = scene
  }

  func setGraphicsOverlays(_ overlays: [GraphicsOverlay]) {
    graphicsOverlays = overlays
  }

  func setAnalysisOverlays(_ overlays: [AnalysisOverlay]) {
    analysisOverlays = overlays
  }

  func setCamera(_ camera: Camera) {
    self.camera = camera
    cameraVersion += 1
  }

  func setSunLighting(_ value: SceneView.SunLighting) { sunLighting = value }
  func setAtmosphereEffect(_ value: SceneView.AtmosphereEffect) { atmosphereEffect = value }
  func setSunDate(_ value: Date) { sunDate = value }
}

/// SwiftUI host for the ArcGIS `SceneView`. Loads the scene, reports the result, and forwards taps.
struct ExpoArcgisSceneContainer: View {
  @ObservedObject var model: SceneViewModel

  var body: some View {
    if let scene = model.scene {
      SceneViewReader { proxy in
        SceneView(
          scene: scene,
          graphicsOverlays: model.graphicsOverlays,
          analysisOverlays: model.analysisOverlays
        )
          // ArcGIS lighting modifiers return `SceneView`, so they precede the SwiftUI modifiers.
          .sunLighting(model.sunLighting)
          .atmosphereEffect(model.atmosphereEffect)
          .sunDate(model.sunDate)
          .onSingleTapGesture { screenPoint, scenePoint in
            // SceneView delivers an optional `Point` (a 3D tap can miss the globe).
            guard let scenePoint else { return }
            let wgs84 = GeometryEngine.project(scenePoint, into: .wgs84) ?? scenePoint
            model.onTap?(wgs84.y, wgs84.x, Double(screenPoint.x), Double(screenPoint.y))
          }
          .onAppear { model.proxy = proxy }
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
          .task(id: model.cameraVersion) {
            guard let camera = model.camera else { return }
            _ = await proxy.setViewpointCamera(camera, duration: 0.5)
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
    // The scene may be replaced asynchronously (e.g. once a mobile scene package loads) — re-render.
    ref?.onSceneChanged = { [weak self] scene in self?.model.setScene(scene) }
  }

  /// Retries loading the scene (Loadable pattern) — useful after a network outage. Re-emits the result.
  func retryLoad() async throws {
    guard let scene = model.scene else { return }
    do {
      try await scene.retryLoad()
      onSceneLoaded(["spatialReferenceWkid": NSNull()])
    } catch {
      onSceneLoadError(["message": error.localizedDescription])
    }
  }

  /// Identifies the features under a screen point (3D). Mirrors `MapView.identify`.
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

  /// Identifies popups under a screen point — evaluates each and returns `{ title, fields }`.
  func identifyPopups(_ screenPoint: [String: Any], _ options: [String: Any]?) async throws -> [[String: Any]] {
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
    return await serializePopups(results)
  }

  func setGraphicsOverlays(_ refs: [GraphicsOverlayRef]) {
    model.setGraphicsOverlays(refs.map { $0.overlay })
  }

  func setAnalysisOverlays(_ refs: [AnalysisOverlayRef]) {
    model.setAnalysisOverlays(refs.map { $0.overlay })
  }

  /// Animates the view to a runtime camera sent from JS.
  func setCamera(_ c: [String: Any]?) {
    guard let c, let position = c["position"] as? [String: Any] else { return }
    let point = scenePoint(position)
    let camera = Camera(
      location: point,
      heading: (c["heading"] as? NSNumber)?.doubleValue ?? 0,
      pitch: (c["pitch"] as? NSNumber)?.doubleValue ?? 0,
      roll: (c["roll"] as? NSNumber)?.doubleValue ?? 0
    )
    model.setCamera(camera)
  }

  func setSunLighting(_ s: String?) { model.setSunLighting(sunLightingMode(s)) }
  func setAtmosphereEffect(_ s: String?) { model.setAtmosphereEffect(atmosphereEffectMode(s)) }
  func setSunTime(_ ms: Double?) {
    if let ms { model.setSunDate(Date(timeIntervalSince1970: ms / 1000)) }
  }
}

/// Maps the JS sun-lighting union to the native `SceneView.SunLighting`.
func sunLightingMode(_ s: String?) -> SceneView.SunLighting {
  switch s {
  case "light": return .light
  case "lightAndShadows": return .lightAndShadows
  default: return .off
  }
}

/// Maps the JS atmosphere union to the native `SceneView.AtmosphereEffect`.
func atmosphereEffectMode(_ s: String?) -> SceneView.AtmosphereEffect {
  switch s {
  case "off": return .off
  case "realistic": return .realistic
  default: return .horizonOnly
  }
}
