import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `FeatureFormView` for a feature from a view's `identify` (expo-arcgis's
/// `FeatureRef`): the form its layer defines, with the Toolkit's own Save and Discard.
final class FeatureFormPanelView: ExpoView {
  let onDismiss = EventDispatcher()
  let onEditingEvent = EventDispatcher()

  private let model = FeatureFormPanelModel()
  private var hostingController: UIHostingController<FeatureFormPanelContent>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onDismiss = { [weak self] in self?.onDismiss() }
    model.onEditingEvent = { [weak self] type, willNavigate in
      self?.onEditingEvent(["type": type, "willNavigate": willNavigate])
    }
    let hostingController = UIHostingController(rootView: FeatureFormPanelContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The SwiftUI inside presents from its hosting controller (its alerts, pickers and camera),
  // which needs a parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  /// Receives the feature to edit, and makes its form. Only a feature table's features have one.
  func setFeature(_ ref: FeatureRef?) {
    model.featureForm = (ref?.feature as? ArcGISFeature).map { FeatureForm(feature: $0) }
  }

  /// Whether the form shows its close button: the Toolkit shows it when given `isPresented`.
  func setDismissible(_ value: Bool?) {
    model.dismissible = value ?? false
  }

  func setEditingButtons(_ value: String?) {
    switch value {
    case "visible": model.editingButtons = .visible
    case "hidden": model.editingButtons = .hidden
    default: model.editingButtons = .automatic
    }
  }

  func setValidationErrorVisibility(_ value: String?) {
    model.validationErrors = value == "visible" ? .visible : .automatic
  }

  func setNavigationEnabled(_ value: Bool?) {
    model.navigationEnabled = value ?? true
  }
}

final class FeatureFormPanelModel: ObservableObject {
  @Published var featureForm: FeatureForm?
  @Published var dismissible = false
  @Published var editingButtons: Visibility = .automatic
  @Published var validationErrors: FeatureFormView.ValidationErrorVisibility = .automatic
  @Published var navigationEnabled = true
  var onDismiss: (() -> Void)?
  var onEditingEvent: ((_ type: String, _ willNavigate: Bool) -> Void)?
}

struct FeatureFormPanelContent: View {
  @ObservedObject var model: FeatureFormPanelModel
  @State private var isPresented = true

  var body: some View {
    if let featureForm = model.featureForm {
      FeatureFormView(root: featureForm, isPresented: model.dismissible ? $isPresented : nil)
        .editingButtons(model.editingButtons)
        .validationErrors(model.validationErrors)
        .navigationDisabled(!model.navigationEnabled)
        .onFormEditingEvent { event in
          switch event {
          case .savedEdits(let willNavigate): model.onEditingEvent?("savedEdits", willNavigate)
          case .discardedEdits(let willNavigate): model.onEditingEvent?("discardedEdits", willNavigate)
          default: break
          }
        }
        // A new form, a new view: the Toolkit takes its root form when it is made.
        .id(ObjectIdentifier(featureForm))
        .onChange(of: isPresented) {
          guard !isPresented else { return }
          model.onDismiss?()
          // It shows for as long as React shows it, ready to close again.
          isPresented = true
        }
    }
  }
}
