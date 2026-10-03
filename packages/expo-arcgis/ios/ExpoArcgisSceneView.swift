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
  @Published private(set) var cameraController: CameraController?
  @Published private(set) var grid: ArcGIS.Grid?
  @Published var timeExtent: ArcGIS.TimeExtent?
  /// The view proxy captured from `SceneViewReader`, used for `identify` (not published).
  var proxy: SceneViewProxy?
  /// The view of another package that shows the scene (expo-arcgis-toolkit's AR views), if any.
  @Published private(set) var container: SceneViewContainer?
  /// Whether the view state has the proxy of the container's SceneView yet.
  private var containerProxyShared = false
  /// The UI other packages draw over the scene (expo-arcgis-toolkit's compass…).
  @Published private(set) var accessories: [GeoViewAccessory] = []
  /// The view's live state for its accessories — published apart from this model, see GeoViewState.
  let viewState = GeoViewState()
  /// The `<Callout>` the scene shows, published apart from this model as well.
  let callout = CalloutHost()
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

  func setContainer(_ container: SceneViewContainer?) {
    guard container !== self.container else { return }
    self.container = container
    containerProxyShared = false
  }

  /// Takes the proxy a container's SceneViewReader passes as it builds the SceneView: identify and
  /// screen projections go through it. The container builds the SceneView while SwiftUI draws, so
  /// the published view state gets the proxy afterwards.
  func takeContainerProxy(_ proxy: SceneViewProxy) {
    self.proxy = proxy
    guard !containerProxyShared else { return }
    containerProxyShared = true
    DispatchQueue.main.async { self.viewState.sceneViewProxy = proxy }
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
  func setCameraController(_ controller: CameraController?) { cameraController = controller }
  func setGrid(_ grid: ArcGIS.Grid?) { self.grid = grid }
}

/// SwiftUI host for the ArcGIS `SceneView`. Loads the scene, reports the result, and forwards taps.
struct ExpoArcgisSceneContainer: View {
  @ObservedObject var model: SceneViewModel
  @ObservedObject var callout: CalloutHost

  init(model: SceneViewModel) {
    _model = ObservedObject(wrappedValue: model)
    _callout = ObservedObject(wrappedValue: model.callout)
  }

  var body: some View {
    if let scene = model.scene {
      if let container = model.container {
        // A package's view shows the scene (expo-arcgis-toolkit's AR views) and sets the camera.
        container.body { proxy in
          model.takeContainerProxy(proxy)
          return sceneView(scene)
        }
          .task(id: ObjectIdentifier(scene)) { await load(scene) }
      } else {
        SceneViewReader { proxy in
          sceneView(scene)
            .overlay {
              GeoViewAccessories(
                accessories: model.accessories, insets: EdgeInsets(), state: model.viewState)
            }
            .onAppear {
              model.proxy = proxy
              model.viewState.sceneViewProxy = proxy
            }
            .task(id: ObjectIdentifier(scene)) { await load(scene) }
            .task(id: model.cameraVersion) {
              guard let camera = model.camera else { return }
              _ = await proxy.setViewpointCamera(camera, duration: 0.5)
            }
        }
      }
    }
  }

  /// The SceneView with what the view's props and events set. Its modifiers are all ArcGIS ones,
  /// which return `SceneView`: a container's closure takes one.
  private func sceneView(_ scene: ArcGIS.Scene) -> SceneView {
    SceneView(
      scene: scene,
      timeExtent: Binding(get: { model.timeExtent }, set: { model.timeExtent = $0 }),
      graphicsOverlays: model.graphicsOverlays,
      analysisOverlays: model.analysisOverlays
    )
      .sunLighting(model.sunLighting)
      .atmosphereEffect(model.atmosphereEffect)
      .sunDate(model.sunDate)
      // A nil prop falls back to a fresh `GlobeCameraController`, which is the SDK's default
      // navigation controller.
      .cameraController(model.cameraController ?? GlobeCameraController())
      .grid(model.grid)
      // A `<Callout>` among the view's React children: its content, in the SDK's callout.
      .callout(placement: $callout.placement) { _ in
        if let view = callout.view { CalloutContent(view: view) }
      }
      .onSingleTapGesture { screenPoint, scenePoint in
        // SceneView delivers an optional `Point` (a 3D tap can miss the globe).
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
  }

  private func load(_ scene: ArcGIS.Scene) async {
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

  // The SwiftUI inside presents from its hosting controller (sheets, popovers, alerts), which needs
  // a parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  // Fabric mounts React children by index among the subviews, where the map's hosting view comes
  // first: as is, they would sit under the map. Shifted past it, they render above the map, and
  // touches that miss them still reach it. React Native keeps the order when it wraps the subviews
  // in a container (for `overflow` or `filter` styles), so the hosting view stays first.
  // A `<Callout>` child shows in the scene's callout instead (see `CalloutHost`).
  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let drawn = model.callout.mount(childComponentView, at: index) else { return }
    super.mountChildComponentView(childComponentView, index: drawn + 1)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let drawn = model.callout.unmount(childComponentView, at: index) else { return }
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

  /// Returns the terrain elevation (meters) at a point on the scene's base surface, or nil.
  func getElevation(_ point: [String: Any]) async throws -> Double? {
    guard let scene = model.scene, let point = geometryFromDict(point) as? Point else { return nil }
    return try await scene.baseSurface.elevation(at: point)
  }

  /// The camera as the user has left it, in WGS84 — the same shape the `camera` prop accepts, so a
  /// caller can read it, adjust it, and hand it back.
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

  /// Where a scene location currently falls on screen, in points, plus whether anything is between
  /// it and the camera. `nil` before the view has drawn.
  func screenPoint(_ location: [String: Any]) -> [String: Any]? {
    guard let proxy = model.proxy, let point = geometryFromDict(location) as? Point,
      let result = proxy.screenPoint(fromLocation: point)
    else { return nil }
    return [
      "x": Double(result.screenPoint.x),
      "y": Double(result.screenPoint.y),
      "visibility": screenPointVisibility(result.visibility),
    ]
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

  /// Sets the coordinate grid overlay from JS (nil clears it).
  func setGrid(_ dict: [String: Any]?) { model.setGrid(buildGrid(dict)) }

  /// Receives the accessories other packages declare as `<SceneView>` children (expo-arcgis-toolkit).
  func setAccessories(_ refs: [SharedObject]) {
    model.setAccessories(refs.compactMap { $0 as? GeoViewAccessory })
  }

  /// Receives the view of another package that shows the scene (expo-arcgis-toolkit's AR views).
  func setContainer(_ ref: SharedObject?) {
    model.setContainer(ref as? SceneViewContainer)
  }

  /// The view's `GeoViewRef`, which carries its state to the views of packages built on
  /// expo-arcgis.
  private var geoViewRef: GeoViewRef?

  func setGeoViewRef(_ ref: GeoViewRef?) {
    guard ref !== geoViewRef else { return }
    geoViewRef?.state = nil
    geoViewRef = ref
    ref?.state = model.viewState
  }

  deinit {
    geoViewRef?.state = nil
  }

  /// Filters time-aware layers to a time window from JS (nil shows all time steps).
  func setTimeExtent(_ dict: [String: Any]?) {
    guard let dict,
          let startMs = (dict["startTime"] as? NSNumber)?.doubleValue,
          let endMs = (dict["endTime"] as? NSNumber)?.doubleValue
    else { model.timeExtent = nil; return }
    model.timeExtent = ArcGIS.TimeExtent(
      startDate: Date(timeIntervalSince1970: startMs / 1000),
      endDate: Date(timeIntervalSince1970: endMs / 1000)
    )
  }

  /// Camera-controller config + the target graphic for an `orbitGeoElement` controller. Stored so
  /// the controller can be (re)built once both the config and the graphic ref are available.
  private var cameraControllerConfig: [String: Any]?
  private var orbitGraphic: GraphicRef?

  /// Stores the camera-controller config (`type`, `target`, `distance`) and rebuilds.
  func setCameraController(_ c: [String: Any]?) {
    cameraControllerConfig = c
    rebuildCameraController()
  }

  /// Stores the target graphic for an `orbitGeoElement` camera controller and rebuilds.
  func setOrbitGraphic(_ ref: GraphicRef?) {
    orbitGraphic = ref
    rebuildCameraController()
  }

  /// Builds and assigns the camera controller from the stored config, combining with `orbitGraphic`.
  private func rebuildCameraController() {
    let c = cameraControllerConfig
    switch c?["type"] as? String {
    case "orbitLocation":
      let target = scenePoint(c?["target"] as? [String: Any] ?? [:])
      let distance = (c?["distance"] as? NSNumber)?.doubleValue ?? 1500.0
      model.setCameraController(OrbitLocationCameraController(target: target, distance: distance))
    case "orbitGeoElement":
      guard let graphic = orbitGraphic else { model.setCameraController(nil); return }
      let distance = (c?["distance"] as? NSNumber)?.doubleValue ?? 1500.0
      model.setCameraController(OrbitGeoElementCameraController(target: graphic.graphic, distance: distance))
    case "globe":
      model.setCameraController(GlobeCameraController())
    default:
      model.setCameraController(nil)
    }
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

/// Maps `ScreenPointFromLocationResult.Visibility` to the kebab-case strings the JS side uses.
private func screenPointVisibility(_ visibility: ScreenPointFromLocationResult.Visibility) -> String {
  switch visibility {
  case .visible: return "visible"
  case .hiddenByBaseSurface: return "hidden-by-base-surface"
  case .hiddenByEarth: return "hidden-by-earth"
  case .hiddenByElevation: return "hidden-by-elevation"
  @unknown default: return "visible"
  }
}
