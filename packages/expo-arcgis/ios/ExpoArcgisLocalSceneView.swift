import ArcGIS
import ExpoModulesCore
import SwiftUI

/// Holds the `Scene` a `<LocalSceneView>` shows and bridges its events to JS.
final class LocalSceneViewModel: ObservableObject {
  @Published private(set) var scene: ArcGIS.Scene?
  @Published private(set) var camera: Camera?
  /// Bumped on each camera change so the SwiftUI `.task(id:)` re-runs and re-animates.
  @Published private(set) var cameraVersion = 0
  /// The UI other packages draw over the scene (expo-arcgis-toolkit's building explorer…).
  @Published private(set) var accessories: [GeoViewAccessory] = []
  /// The view's live state for its accessories and panels; see GeoViewState.
  let viewState = GeoViewState()
  /// Last camera the view reported. Plain storage, not published — reading it must not redraw.
  var currentCamera: Camera?

  var onLoaded: (() -> Void)?
  var onLoadError: ((String) -> Void)?
  var onTap: ((_ latitude: Double, _ longitude: Double, _ screenX: Double, _ screenY: Double) -> Void)?

  func setScene(_ scene: ArcGIS.Scene?) {
    self.scene = scene
    viewState.scene = scene
  }

  func setAccessories(_ accessories: [GeoViewAccessory]) {
    self.accessories = accessories
  }

  func setCamera(_ camera: Camera) {
    self.camera = camera
    cameraVersion += 1
  }
}

/// SwiftUI host for the ArcGIS `LocalSceneView`. Loads the scene, reports the result, and forwards
/// taps.
struct ExpoArcgisLocalSceneContainer: View {
  @ObservedObject var model: LocalSceneViewModel

  var body: some View {
    if let scene = model.scene {
      LocalSceneViewReader { proxy in
        LocalSceneView(scene: scene)
          .onSingleTapGesture { screenPoint, scenePoint in
            // A 3D tap can miss the scene: then there is no point to report.
            guard let scenePoint else { return }
            let wgs84 = GeometryEngine.project(scenePoint, into: .wgs84) ?? scenePoint
            model.onTap?(wgs84.y, wgs84.x, Double(screenPoint.x), Double(screenPoint.y))
          }
          .onCameraChanged { camera in
            model.currentCamera = camera
            model.viewState.camera = camera
          }
          .onViewpointChanged(kind: .centerAndScale) { model.viewState.viewpoint = $0 }
          .onSpatialReferenceChanged { model.viewState.spatialReference = $0 }
          .onNavigatingChanged { model.viewState.isNavigating = $0 }
          .onAttributionBarHeightChanged { model.viewState.attributionBarHeight = $0 }
          .overlay {
            GeoViewAccessories(
              accessories: model.accessories, insets: EdgeInsets(), state: model.viewState)
          }
          .onAppear { model.viewState.localSceneViewProxy = proxy }
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

/// Declarative local 3D scene host: the SDK's `LocalSceneView`, for a scene whose viewing mode is
/// local (a local web scene, or `<Scene viewingMode="local">`). Renders the `SceneRef` passed as the
/// `scene` view prop.
class ExpoArcgisLocalSceneView: ExpoView {
  private let onSceneLoaded = EventDispatcher()
  private let onSceneLoadError = EventDispatcher()
  private let onTap = EventDispatcher()

  private let model = LocalSceneViewModel()
  private var hostingController: UIHostingController<ExpoArcgisLocalSceneContainer>?
  /// The view's `GeoViewRef`, which carries its state to the views of packages built on
  /// expo-arcgis.
  private var geoViewRef: GeoViewRef?

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

    let hostingController = UIHostingController(
      rootView: ExpoArcgisLocalSceneContainer(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  deinit {
    geoViewRef?.state = nil
  }

  // The SwiftUI inside presents from its hosting controller (sheets, popovers, alerts), which needs
  // a parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  // React children render above the scene, as in `ExpoArcgisSceneView`. A `<Callout>` doesn't: the
  // SDK's local scene view supports no callout, so it shows nowhere, as on Android.
  private let callouts = CalloutHost()

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let drawn = callouts.mount(childComponentView, at: index) else { return }
    super.mountChildComponentView(childComponentView, index: drawn + 1)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let drawn = callouts.unmount(childComponentView, at: index) else { return }
    super.unmountChildComponentView(childComponentView, index: drawn + 1)
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

  /// The camera as the user has left it, in WGS84 — the shape the `camera` prop accepts.
  func getCamera() -> [String: Any]? {
    guard let camera = model.currentCamera else { return nil }
    let location = GeometryEngine.project(camera.location, into: .wgs84) as? Point ?? camera.location
    var position: [String: Any] = ["x": location.x, "y": location.y]
    if let z = location.z { position["z"] = z }
    return [
      "position": position,
      "heading": camera.heading,
      "pitch": camera.pitch,
      "roll": camera.roll,
    ]
  }

  /// Animates the view to a camera sent from JS.
  func setCamera(_ c: [String: Any]?) {
    guard let c, let position = c["position"] as? [String: Any] else { return }
    model.setCamera(
      Camera(
        location: scenePoint(position),
        heading: (c["heading"] as? NSNumber)?.doubleValue ?? 0,
        pitch: (c["pitch"] as? NSNumber)?.doubleValue ?? 0,
        roll: (c["roll"] as? NSNumber)?.doubleValue ?? 0
      ))
  }

  /// Receives the accessories other packages declare as `<LocalSceneView>` children.
  func setAccessories(_ refs: [SharedObject]) {
    model.setAccessories(refs.compactMap { $0 as? GeoViewAccessory })
  }

  func setGeoViewRef(_ ref: GeoViewRef?) {
    guard ref !== geoViewRef else { return }
    geoViewRef?.state = nil
    geoViewRef = ref
    ref?.state = model.viewState
  }
}
