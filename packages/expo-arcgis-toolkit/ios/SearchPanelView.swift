import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `SearchView` for a `<MapView>` or `<SceneView>`: it searches its sources (the
/// world geocoder by default) and moves the view to the results, which it draws into the overlay
/// the app gives it.
final class SearchPanelView: ExpoView {
  let onQueryChange = EventDispatcher()

  private let model = SearchModel()
  private var hostingController: UIHostingController<SearchContent>?
  private var stateSubscription: AnyCancellable?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    model.onQueryChange = { [weak self] query in self?.onQueryChange(["query": query]) }
    let hostingController = UIHostingController(rootView: SearchContent(model: model))
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

  /// Receives the view the search is for, and follows its state.
  func setGeoView(_ ref: GeoViewRef?) {
    stateSubscription = ref?.$state.sink { [weak self] state in self?.model.state = state }
    if ref == nil { model.state = nil }
  }

  /// Receives the search sources; nil or empty for the Toolkit's (the world geocoder).
  func setSources(_ items: [[String: Any]]?) {
    model.sources = items?.compactMap(searchSource(from:)) ?? []
    model.sourcesVersion += 1
  }

  /// Receives the overlay the app declared for the results (expo-arcgis's GraphicsOverlayRef).
  func setResultsOverlay(_ ref: GraphicsOverlayRef?) {
    model.resultsOverlay = ref?.overlay
  }

  func setEnableResultListView(_ value: Bool?) { model.enableResultListView = value ?? true }
  func setPrompt(_ value: String?) { model.prompt = value }
  func setNoResultsMessage(_ value: String?) { model.noResultsMessage = value }
  func setCurrentQuery(_ value: String?) { model.currentQuery = value }
  func setResultMode(_ value: String?) { model.resultMode = searchResultMode(value) }
  func setRepeatSearch(_ value: Bool?) { model.repeatSearch = value ?? false }
  func setQueryCenterFromView(_ value: Bool?) { model.queryCenterFromView = value ?? false }

  /// Receives a fixed center to prioritize results around: `{ latitude, longitude }`.
  func setQueryCenter(_ value: [String: Any]?) {
    guard let latitude = (value?["latitude"] as? NSNumber)?.doubleValue,
          let longitude = (value?["longitude"] as? NSNumber)?.doubleValue
    else {
      model.queryCenter = nil
      return
    }
    model.queryCenter = Point(latitude: latitude, longitude: longitude)
  }
}

final class SearchModel: ObservableObject {
  @Published var state: GeoViewState?
  @Published var sources: [SearchSource] = []
  @Published var sourcesVersion = 0
  @Published var resultsOverlay: GraphicsOverlay?
  @Published var enableResultListView = true
  @Published var prompt: String?
  @Published var noResultsMessage: String?
  @Published var currentQuery: String?
  @Published var resultMode: SearchResultMode = .automatic
  @Published var repeatSearch = false
  @Published var queryCenterFromView = false
  @Published var queryCenter: Point?
  var onQueryChange: ((String) -> Void)?
}

struct SearchContent: View {
  @ObservedObject var model: SearchModel

  var body: some View {
    if let state = model.state {
      SearchBody(model: model, view: state)
    }
  }
}

private struct SearchBody: View {
  @ObservedObject var model: SearchModel
  @ObservedObject var view: GeoViewState

  var body: some View {
    search
      // The Toolkit's search takes its sources when it is made, and its query, results overlay
      // and result mode when it appears: make a new one when they change.
      .id(Identity(
        sources: model.sourcesVersion,
        resultsOverlay: model.resultsOverlay.map(ObjectIdentifier.init),
        resultMode: "\(model.resultMode)",
        currentQuery: model.currentQuery))
  }

  private var search: SearchView {
    var search = SearchView(sources: model.sources, geoViewProxy: geoViewProxy)
      .enableResultListView(model.enableResultListView)
      .resultsOverlay(model.resultsOverlay)
      .resultMode(model.resultMode)
      .onQueryChanged { query in model.onQueryChange?(query) }
    if let prompt = model.prompt { search = search.prompt(prompt) }
    if let message = model.noResultsMessage { search = search.noResultsMessage(message) }
    if let query = model.currentQuery { search = search.currentQuery(query) }
    if model.repeatSearch {
      // "Repeat search here" once the view has moved from the results.
      search = search
        .geoViewExtent(Binding(get: { view.visibleArea?.extent }, set: { _ in }))
        .isGeoViewNavigating(Binding(get: { view.isNavigating }, set: { _ in }))
    }
    if model.queryCenterFromView {
      search = search.queryCenter(
        Binding(get: { view.viewpoint?.targetGeometry.extent.center }, set: { _ in }))
    } else if let center = model.queryCenter {
      search = search.queryCenter(.constant(center))
    }
    return search
  }

  private var geoViewProxy: GeoViewProxy? {
    view.mapViewProxy ?? view.sceneViewProxy
  }

  private struct Identity: Hashable {
    let sources: Int
    let resultsOverlay: ObjectIdentifier?
    let resultMode: String
    let currentQuery: String?
  }
}

/// A search source from JS. Settings it leaves out keep the Toolkit's defaults.
private func searchSource(from item: [String: Any]) -> SearchSource? {
  let source: LocatorSearchSource
  switch item["type"] as? String {
  case "smartLocator":
    let smart = SmartLocatorSearchSource()
    if item.keys.contains("repeatSearchResultThreshold") {
      smart.repeatSearchResultThreshold = (item["repeatSearchResultThreshold"] as? NSNumber)?.intValue
    }
    if item.keys.contains("repeatSuggestResultThreshold") {
      smart.repeatSuggestResultThreshold = (item["repeatSuggestResultThreshold"] as? NSNumber)?.intValue
    }
    source = smart
  case "locator":
    if let url = (item["url"] as? String).flatMap(URL.init(string:)) {
      source = LocatorSearchSource(locatorTask: LocatorTask(url: url))
    } else {
      source = LocatorSearchSource()
    }
  default:
    return nil
  }
  if let name = item["name"] as? String { source.name = name }
  if let maximum = (item["maximumResults"] as? NSNumber)?.intValue { source.maximumResults = maximum }
  if let maximum = (item["maximumSuggestions"] as? NSNumber)?.intValue {
    source.maximumSuggestions = maximum
  }
  return source
}

private func searchResultMode(_ value: String?) -> SearchResultMode {
  switch value {
  case "single": return .single
  case "multiple": return .multiple
  default: return .automatic
  }
}
