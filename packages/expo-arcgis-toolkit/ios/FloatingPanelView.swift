import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's floating panel (`View.floatingPanel`) over this view's frame: inside a
/// `<MapView>` or `<SceneView>`, over the map. Its React content is the one child, a
/// `FloatingPanelContentView`, which the panel shows instead of this view. The panel decides the
/// content's size (its width and detent), and React lays the content out in it.
final class FloatingPanelView: ExpoView {
  let onSelectedDetentChange = EventDispatcher()

  private let model = FloatingPanelModel()
  private var hostingController: UIHostingController<FloatingPanelRoot>?
  private var stateSubscription: AnyCancellable?
  /// The last detent React set, so that a render resending it doesn't undo the user's drag.
  private var detentProp: FloatingPanelDetent?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onSelectedDetentChange = { [weak self] detent in
      self?.onSelectedDetentChange(["detent": detentPayload(detent)])
    }
    let hostingController = UIHostingController(rootView: FloatingPanelRoot(model: model))
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

  // The view covers the map, the panel only part of it: touches elsewhere reach the map. The
  // hosting view takes every touch in its frame, so whether one is on the panel's own handle or
  // background is up to the panel's frame. Touches on the React content hit its views.
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard let view = super.hitTest(point, with: event) else { return nil }
    guard view === self || view === hostingController?.view else { return view }
    return model.isPresented && model.panelFrame.contains(point) ? view : nil
  }

  // The content is shown by the panel, not as one of this view's subviews.
  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let content = childComponentView as? FloatingPanelContentView else {
      // The hosting view comes first among the subviews.
      return super.mountChildComponentView(childComponentView, index: index + 1)
    }
    model.content = content
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard childComponentView === model.content else {
      return super.unmountChildComponentView(childComponentView, index: index + 1)
    }
    model.content = nil
    childComponentView.removeFromSuperview()
  }

  /// Receives the view the panel floats over, and follows its attribution bar.
  func setGeoView(_ ref: GeoViewRef?) {
    stateSubscription = ref?.$state
      .map { state -> AnyPublisher<CGFloat, Never> in
        state?.$attributionBarHeight.eraseToAnyPublisher() ?? Just(0).eraseToAnyPublisher()
      }
      .switchToLatest()
      .removeDuplicates()
      .sink { [weak self] in self?.model.viewAttributionBarHeight = $0 }
    if ref == nil { model.viewAttributionBarHeight = 0 }
  }

  func setIsPresented(_ value: Bool) {
    model.isPresented = value
  }

  /// `{ kind, value? }`; nil leaves the panel where it is.
  func setSelectedDetent(_ value: [String: Any]?) {
    let detent = detent(from: value)
    guard detent != detentProp else { return }
    detentProp = detent
    if let detent { model.selectedDetent = detent }
  }

  /// `'leading'`, `'center'` or `'trailing'` (the default).
  func setHorizontalAlignment(_ value: String?) {
    switch value {
    case "leading": model.horizontalAlignment = .leading
    case "center": model.horizontalAlignment = .center
    default: model.horizontalAlignment = .trailing
    }
  }

  func setMaxWidth(_ value: Double?) {
    model.maxWidth = value.map { CGFloat($0) } ?? 400
  }

  func setBackgroundColor(_ value: UIColor?) {
    model.backgroundColor = Color(uiColor: value ?? .systemBackground)
  }

  /// Nil for the attribution bar of the view the panel floats over.
  func setAttributionBarHeight(_ value: Double?) {
    model.attributionBarHeight = value.map { CGFloat($0) }
  }
}

/// The React content of a `FloatingPanelView`. Its size is the panel's, which the panel sets.
final class FloatingPanelContentView: ExpoView {}

final class FloatingPanelModel: ObservableObject {
  @Published var content: FloatingPanelContentView? {
    didSet { if contentSize != .zero { content?.setViewSize(contentSize) } }
  }
  @Published var isPresented = true
  /// The Toolkit's initial detent.
  @Published var selectedDetent = FloatingPanelDetent.half
  @Published var horizontalAlignment = HorizontalAlignment.trailing
  @Published var maxWidth: CGFloat = 400
  @Published var backgroundColor = Color(uiColor: .systemBackground)
  /// React's; nil for the view's.
  @Published var attributionBarHeight: CGFloat?
  @Published var viewAttributionBarHeight: CGFloat = 0
  /// The panel's frame in the view, handle included: the part of the view that takes touches.
  var panelFrame = CGRect.zero
  var contentSize = CGSize.zero {
    didSet { if contentSize != oldValue { content?.setViewSize(contentSize) } }
  }
  var onSelectedDetentChange: ((FloatingPanelDetent) -> Void)?
}

struct FloatingPanelRoot: View {
  @ObservedObject var model: FloatingPanelModel
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @Environment(\.verticalSizeClass) private var verticalSizeClass

  private static let space = "expo-arcgis-toolkit.floating-panel"

  var body: some View {
    Color.clear
      .floatingPanel(
        attributionBarHeight: model.attributionBarHeight ?? model.viewAttributionBarHeight,
        backgroundColor: model.backgroundColor,
        selectedDetent: Binding(
          get: { model.selectedDetent },
          set: { detent in
            model.selectedDetent = detent
            model.onSelectedDetentChange?(detent)
          }),
        horizontalAlignment: model.horizontalAlignment,
        isPresented: $model.isPresented,
        maxWidth: model.maxWidth
      ) {
        if let content = model.content {
          FloatingPanelContent(view: content)
            .onGeometryChange(for: CGRect.self) {
              $0.frame(in: .named(Self.space))
            } action: { frame in
              model.contentSize = frame.size
              model.panelFrame = panelFrame(around: frame)
            }
        }
      }
      .coordinateSpace(.named(Self.space))
  }

  /// The panel's frame from its content's: the Toolkit puts the handle (30 points, and a divider)
  /// above the content in portrait, where the panel reaches the bottom of the view, and below it
  /// otherwise.
  private func panelFrame(around content: CGRect) -> CGRect {
    let handle: CGFloat = 31
    let isPortrait = horizontalSizeClass == .compact && verticalSizeClass == .regular
    return isPortrait
      ? CGRect(
        x: content.minX, y: content.minY - handle, width: content.width,
        height: .greatestFiniteMagnitude)
      : CGRect(
        x: content.minX, y: content.minY, width: content.width, height: content.height + handle)
  }
}

/// A floating panel's React content inside the panel. SwiftUI gets a container rather than the
/// React view, so that it never moves the view React lays out.
private struct FloatingPanelContent: UIViewRepresentable {
  let view: FloatingPanelContentView

  func makeUIView(context: Context) -> UIView {
    let container = UIView()
    container.addSubview(view)
    return container
  }

  func updateUIView(_ container: UIView, context: Context) {
    if view.superview !== container { container.addSubview(view) }
  }

  // The content fills the panel.
  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIView, context: Context) -> CGSize? {
    proposal.replacingUnspecifiedDimensions()
  }

  static func dismantleUIView(_ container: UIView, coordinator: ()) {
    // Let go of the React view, unless another container already took it.
    container.subviews.forEach { $0.removeFromSuperview() }
  }
}

/// A detent from JS: `{ kind: 'summary' | 'half' | 'full' | 'fraction' | 'height', value? }`.
private func detent(from value: [String: Any]?) -> FloatingPanelDetent? {
  let number = (value?["value"] as? NSNumber).map { CGFloat($0.doubleValue) }
  switch value?["kind"] as? String {
  case "summary": return .summary
  case "half": return .half
  case "full": return .full
  case "fraction": return number.map { .fraction($0) }
  case "height": return number.map { .height($0) }
  default: return nil
  }
}

/// A detent for JS, as `detent(from:)` reads it.
private func detentPayload(_ detent: FloatingPanelDetent) -> [String: Any] {
  switch detent {
  case .summary: return ["kind": "summary"]
  case .half: return ["kind": "half"]
  case .full: return ["kind": "full"]
  case let .fraction(fraction): return ["kind": "fraction", "value": Double(fraction)]
  case let .height(height): return ["kind": "height", "value": Double(height)]
  }
}
