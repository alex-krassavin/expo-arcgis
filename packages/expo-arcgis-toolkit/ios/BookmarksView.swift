import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `Bookmarks` for a `<MapView>` or `<SceneView>`: the bookmarks of its map or scene,
/// or the ones given. Picking one moves the view to it.
final class BookmarksView: ExpoView {
  let onSelectionChange = EventDispatcher()
  let onIsPresentedChange = EventDispatcher()

  private let model = BookmarksModel()
  private var hostingController: UIHostingController<BookmarksContent>?
  private var stateSubscription: AnyCancellable?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onSelectionChange = { [weak self] bookmark in
      self?.onSelectionChange(["bookmark": bookmarkPayload(bookmark)])
    }
    model.onIsPresentedChange = { [weak self] isPresented in
      self?.onIsPresentedChange(["isPresented": isPresented])
    }
    let hostingController = UIHostingController(rootView: BookmarksContent(model: model))
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

  /// Receives the view the bookmarks belong to, and follows its state.
  func setGeoView(_ ref: GeoViewRef?) {
    stateSubscription = ref?.$state.sink { [weak self] state in self?.model.state = state }
    if ref == nil { model.state = nil }
  }

  /// Receives the bookmarks to list instead of the map's or scene's own; nil lists those.
  func setBookmarks(_ items: [[String: Any]]?) {
    model.bookmarks = items?.compactMap(bookmark(from:))
  }
}

final class BookmarksModel: ObservableObject {
  @Published var state: GeoViewState?
  @Published var bookmarks: [Bookmark]?
  var onSelectionChange: ((Bookmark) -> Void)?
  var onIsPresentedChange: ((Bool) -> Void)?
}

struct BookmarksContent: View {
  @ObservedObject var model: BookmarksModel

  var body: some View {
    if let state = model.state {
      BookmarksList(model: model, view: state)
    }
  }
}

private struct BookmarksList: View {
  @ObservedObject var model: BookmarksModel
  @ObservedObject var view: GeoViewState
  @State private var selection: Bookmark?
  @State private var isPresented = true

  var body: some View {
    Group {
      if let bookmarks = model.bookmarks {
        Bookmarks(
          isPresented: $isPresented, bookmarks: bookmarks, selection: $selection,
          geoViewProxy: geoViewProxy)
      } else if let geoModel = view.map ?? view.scene {
        Bookmarks(
          isPresented: $isPresented, geoModel: geoModel, selection: $selection,
          geoViewProxy: geoViewProxy)
      }
    }
    .onChange(of: selection) {
      if let selection { model.onSelectionChange?(selection) }
    }
    .onChange(of: isPresented) {
      guard !isPresented else { return }
      model.onIsPresentedChange?(false)
      // It shows for as long as React shows it, ready to ask again.
      isPresented = true
    }
  }

  private var geoViewProxy: GeoViewProxy? {
    view.mapViewProxy ?? view.sceneViewProxy
  }
}

/// A bookmark from JS: `{ name, viewpoint: { latitude, longitude, scale } }`.
private func bookmark(from item: [String: Any]) -> Bookmark? {
  guard let name = item["name"] as? String else { return nil }
  guard let viewpoint = item["viewpoint"] as? [String: Any],
        let latitude = (viewpoint["latitude"] as? NSNumber)?.doubleValue,
        let longitude = (viewpoint["longitude"] as? NSNumber)?.doubleValue,
        let scale = (viewpoint["scale"] as? NSNumber)?.doubleValue
  else { return Bookmark(name: name) }
  return Bookmark(name: name, viewpoint: Viewpoint(latitude: latitude, longitude: longitude, scale: scale))
}

/// A bookmark for JS: its name, and where it goes (WGS84 center and scale) when it has a viewpoint.
private func bookmarkPayload(_ bookmark: Bookmark) -> [String: Any] {
  var payload: [String: Any] = ["name": bookmark.name]
  if let viewpoint = bookmark.viewpoint {
    let center = viewpoint.targetGeometry.extent.center
    let wgs84 = GeometryEngine.project(center, into: .wgs84) ?? center
    payload["viewpoint"] = [
      "latitude": wgs84.y, "longitude": wgs84.x, "scale": viewpoint.targetScale,
    ]
  }
  return payload
}
