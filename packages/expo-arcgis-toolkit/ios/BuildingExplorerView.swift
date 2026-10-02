import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `BuildingExplorer` for a `<LocalSceneView>`: it browses the levels, phases and
/// categories of the scene's building scene layers, and its "zoom to building" moves the view.
final class BuildingExplorerView: ExpoView {
  let onSelectionChange = EventDispatcher()

  private let model = BuildingExplorerModel()
  private var hostingController: UIHostingController<BuildingExplorerContent>?
  private var stateSubscription: AnyCancellable?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onSelectionChange = { [weak self] item in
      self?.onSelectionChange(["selection": item.map(buildingExplorerItemPayload) ?? NSNull()])
    }
    let hostingController = UIHostingController(rootView: BuildingExplorerContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The SwiftUI inside presents from its hosting controller, which needs a parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  /// Receives the view the explorer is for, and follows its state.
  func setGeoView(_ ref: GeoViewRef?) {
    stateSubscription = ref?.$state.sink { [weak self] state in self?.model.state = state }
    if ref == nil { model.state = nil }
  }
}

final class BuildingExplorerModel: ObservableObject {
  @Published var state: GeoViewState?
  // The Toolkit's items are main-actor isolated.
  var onSelectionChange: (@MainActor (BuildingExplorerItem?) -> Void)?
}

struct BuildingExplorerContent: View {
  @ObservedObject var model: BuildingExplorerModel

  var body: some View {
    if let state = model.state {
      BuildingExplorerBody(model: model, view: state)
    }
  }
}

private struct BuildingExplorerBody: View {
  @ObservedObject var model: BuildingExplorerModel
  @ObservedObject var view: GeoViewState
  @State private var items: [BuildingExplorerItem] = []
  @State private var selection: BuildingExplorerItem?

  var body: some View {
    if let scene = view.scene {
      BuildingExplorer(
        scene: scene, items: $items, selection: $selection,
        localSceneViewProxy: view.localSceneViewProxy
      )
      // A new scene, a new explorer: it sets itself up from the scene it is made with.
      .id(ObjectIdentifier(scene))
      .onChange(of: selectionKey) { model.onSelectionChange?(selection) }
    }
  }

  /// The selection's building, level and phase. A selected item stays the same item (items compare
  /// by layer) while its level and phase change; reading them here follows those changes too.
  private var selectionKey: String? {
    selection.map { "\(ObjectIdentifier($0.layer))|\($0.level)|\($0.phase.map(String.init) ?? "")" }
  }
}

/// A building explorer selection for JS: the building scene layer, and the level and phase shown.
@MainActor
private func buildingExplorerItemPayload(_ item: BuildingExplorerItem) -> [String: Any] {
  [
    "layer": item.layer.name,
    "level": item.level,
    "phase": item.phase.map { $0 as Any } ?? NSNull(),
  ]
}
