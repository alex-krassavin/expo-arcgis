import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `UtilityNetworkTrace` for a `<MapView>` whose web map has utility networks: it runs
/// their named trace configurations from starting points the user taps on the map, and draws them
/// and the results into the overlay the app gives it.
final class UtilityNetworkTraceView: ExpoView {
  private let model = UtilityNetworkTraceModel()
  private var hostingController: UIHostingController<UtilityNetworkTraceContent>?
  private var stateSubscription: AnyCancellable?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    let hostingController = UIHostingController(
      rootView: UtilityNetworkTraceContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The SwiftUI inside presents from its hosting controller (its alerts), which needs a parent.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  /// Receives the view the trace is for, and follows its state.
  func setGeoView(_ ref: GeoViewRef?) {
    stateSubscription = ref?.$state.sink { [weak self] state in self?.model.state = state }
    if ref == nil { model.state = nil }
  }

  /// Receives the overlay the app declared for the trace (expo-arcgis's GraphicsOverlayRef).
  func setGraphicsOverlay(_ ref: GraphicsOverlayRef?) {
    model.graphicsOverlay = ref?.overlay
  }

  /// Receives where the user tapped the map: `{ latitude, longitude }`.
  func setMapPoint(_ value: [String: Any]?) {
    guard let latitude = (value?["latitude"] as? NSNumber)?.doubleValue,
          let longitude = (value?["longitude"] as? NSNumber)?.doubleValue
    else {
      model.mapPoint = nil
      return
    }
    model.mapPoint = Point(latitude: latitude, longitude: longitude)
  }
}

final class UtilityNetworkTraceModel: ObservableObject {
  @Published var state: GeoViewState?
  @Published var graphicsOverlay: GraphicsOverlay?
  @Published var mapPoint: Point?
}

struct UtilityNetworkTraceContent: View {
  @ObservedObject var model: UtilityNetworkTraceModel

  var body: some View {
    if let state = model.state {
      UtilityNetworkTraceBody(model: model, view: state)
    }
  }
}

private struct UtilityNetworkTraceBody: View {
  @ObservedObject var model: UtilityNetworkTraceModel
  @ObservedObject var view: GeoViewState

  var body: some View {
    if let map = view.map, let proxy = view.mapViewProxy, let overlay = model.graphicsOverlay {
      UtilityNetworkTrace(
        graphicsOverlay: Binding(get: { overlay }, set: { _ in }),
        map: map,
        mapPoint: Binding(get: { model.mapPoint }, set: { model.mapPoint = $0 }),
        mapViewProxy: proxy
      )
      // The Toolkit takes the map and overlay when it is made: a new one when they change.
      .id(Identity(map: ObjectIdentifier(map), overlay: ObjectIdentifier(overlay)))
    }
  }

  private struct Identity: Hashable {
    let map: ObjectIdentifier
    let overlay: ObjectIdentifier
  }
}
