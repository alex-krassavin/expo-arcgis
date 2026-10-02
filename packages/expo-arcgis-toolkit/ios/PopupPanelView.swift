import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `PopupView` for a popup from a view's `identifyPopups` (expo-arcgis's
/// `PopupRef`): its fields, media, attachments and related records, with expressions evaluated.
final class PopupPanelView: ExpoView {
  let onDismiss = EventDispatcher()
  let onPopupChange = EventDispatcher()

  private let model = PopupPanelModel()
  private var hostingController: UIHostingController<PopupPanelContent>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onDismiss = { [weak self] in self?.onDismiss() }
    model.onPopupChange = { [weak self] popup in self?.onPopupChange(["title": popup.title]) }
    let hostingController = UIHostingController(rootView: PopupPanelContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The SwiftUI inside presents from its hosting controller (media, attachments), which needs a
  // parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  func setPopup(_ ref: PopupRef?) {
    model.popup = ref?.popup
  }

  /// Whether the popup shows its close button: the Toolkit shows it when given `isPresented`.
  func setDismissible(_ value: Bool?) {
    model.dismissible = value ?? false
  }
}

final class PopupPanelModel: ObservableObject {
  @Published var popup: Popup?
  @Published var dismissible = false
  var onDismiss: (() -> Void)?
  var onPopupChange: ((Popup) -> Void)?
}

struct PopupPanelContent: View {
  @ObservedObject var model: PopupPanelModel
  @State private var isPresented = true

  var body: some View {
    if let popup = model.popup {
      PopupView(root: popup, isPresented: model.dismissible ? $isPresented : nil)
        .onPopupChanged { model.onPopupChange?($0) }
        // A new popup, a new view: the Toolkit takes its root popup when it is made.
        .id(ObjectIdentifier(popup))
        .onChange(of: isPresented) {
          guard !isPresented else { return }
          model.onDismiss?()
          // It shows for as long as React shows it, ready to close again.
          isPresented = true
        }
    }
  }
}
