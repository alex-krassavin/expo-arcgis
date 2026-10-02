import ArcGIS
import Combine
import ExpoModulesCore
import SwiftUI

/// `<Callout>`: React content its `<MapView>` or `<SceneView>` shows in the SDK's callout, at a
/// location or a geo element. React lays the content out; the view takes it out of the React
/// children it draws over the map and hands it to the callout instead.
public final class ExpoArcgisCalloutView: ExpoView {
  /// Where the callout points and how big its content is, for the view showing it.
  let state = CalloutState()

  private var location: Point?
  private var geoElement: GeoElement?
  private var tapLocation: Point?
  private var offset = CGPoint.zero
  private var rotateOffsetWithGeoView = false

  public override func layoutSubviews() {
    super.layoutSubviews()
    // React's layout decides the content's size; the callout fits it.
    if state.size != bounds.size { state.size = bounds.size }
  }

  /// `{ latitude, longitude, altitude? }`; nil when the callout points to a geo element, or
  /// nowhere. In a scene, a location without an altitude is at sea level.
  func setLocation(_ value: [String: Any]?) {
    location = point(from: value)
    updatePlacement()
  }

  /// A graphic (`GraphicRef`) or an identified feature (`FeatureRef`).
  func setGeoElement(_ ref: SharedObject?) {
    switch ref {
    case let graphic as GraphicRef: geoElement = graphic.graphic
    case let feature as FeatureRef: geoElement = feature.feature
    default: geoElement = nil
    }
    updatePlacement()
  }

  func setTapLocation(_ value: [String: Any]?) {
    tapLocation = point(from: value)
    updatePlacement()
  }

  /// In points: right and down from the location.
  func setOffset(_ value: [String: Any]?) {
    offset = CGPoint(
      x: (value?["x"] as? NSNumber)?.doubleValue ?? 0,
      y: (value?["y"] as? NSNumber)?.doubleValue ?? 0)
    updatePlacement()
  }

  func setRotateOffsetWithGeoView(_ value: Bool?) {
    rotateOffsetWithGeoView = value ?? false
    updatePlacement()
  }

  private func updatePlacement() {
    if let geoElement {
      state.placement = .geoElement(geoElement, tapLocation: tapLocation)
    } else if let location {
      state.placement = .location(location, offset: offset, allowsOffsetRotation: rotateOffsetWithGeoView)
    } else {
      state.placement = nil
    }
  }

  private func point(from value: [String: Any]?) -> Point? {
    guard let latitude = (value?["latitude"] as? NSNumber)?.doubleValue,
          let longitude = (value?["longitude"] as? NSNumber)?.doubleValue
    else { return nil }
    if let altitude = (value?["altitude"] as? NSNumber)?.doubleValue {
      return Point(x: longitude, y: latitude, z: altitude, spatialReference: .wgs84)
    }
    return Point(latitude: latitude, longitude: longitude)
  }
}

/// A callout's placement and content size.
final class CalloutState: ObservableObject {
  @Published var placement: CalloutPlacement?
  @Published var size = CGSize.zero
}

/// A `<Callout>`'s React content inside the SDK's callout. SwiftUI gets a container rather than the
/// React view, so that it never resizes or moves the view React lays out.
struct CalloutContent: UIViewRepresentable {
  let view: ExpoArcgisCalloutView
  @ObservedObject var state: CalloutState

  init(view: ExpoArcgisCalloutView) {
    self.view = view
    _state = ObservedObject(wrappedValue: view.state)
  }

  func makeUIView(context: Context) -> UIView {
    let container = UIView()
    container.addSubview(view)
    return container
  }

  func updateUIView(_ container: UIView, context: Context) {
    if view.superview !== container { container.addSubview(view) }
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView: UIView, context: Context) -> CGSize? {
    state.size
  }

  static func dismantleUIView(_ container: UIView, coordinator: ()) {
    // Let go of the React view, unless another container already took it.
    container.subviews.forEach { $0.removeFromSuperview() }
  }
}

/// A geo view's callout: the `<Callout>` among its React children that it shows, and where that
/// points.
final class CalloutHost: ObservableObject {
  @Published private(set) var view: ExpoArcgisCalloutView?
  @Published var placement: CalloutPlacement?
  private var children: [UIView] = []
  private var subscription: AnyCancellable?

  /// Records a React child the geo view mounts, and returns where it goes among the views drawn over
  /// the map — nil for a callout, which the callout shows instead.
  func mount(_ child: UIView, at index: Int) -> Int? {
    let drawn = drawnCount(before: index)
    children.insert(child, at: min(index, children.count))
    guard child is ExpoArcgisCalloutView else { return drawn }
    update()
    return nil
  }

  /// Records a React child the geo view unmounts, as for `mount`.
  func unmount(_ child: UIView, at index: Int) -> Int? {
    let drawn = drawnCount(before: index)
    if children.indices.contains(index) { children.remove(at: index) }
    guard child is ExpoArcgisCalloutView else { return drawn }
    update()
    return nil
  }

  /// How many of React's children before `index` are drawn over the map, the callouts left out.
  private func drawnCount(before index: Int) -> Int {
    children.prefix(index).filter { !($0 is ExpoArcgisCalloutView) }.count
  }

  /// Shows the last callout React mounted.
  private func update() {
    let callout = children.last { $0 is ExpoArcgisCalloutView } as? ExpoArcgisCalloutView
    guard callout !== view else { return }
    view = callout
    subscription = callout?.state.$placement.sink { [weak self] in self?.placement = $0 }
    if callout == nil { placement = nil }
  }
}
