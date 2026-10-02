import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `OfflineMapAreasView` for the nearest `<Map>`'s web map: it downloads its
/// preplanned and on-demand map areas, and opens one as an offline map, which JS gets as a `MapRef`
/// to show in a `<MapView map>`.
final class OfflineMapAreasPanelView: ExpoView {
  let onSelectionChange = EventDispatcher()

  private let model = OfflineMapAreasModel()
  private var hostingController: UIHostingController<OfflineMapAreasContent>?
  private var mapSubscription: AnyCancellable?
  private var selectionSubscription: AnyCancellable?
  /// The selected offline map's handle, made once per map so that JS keeps one object for it.
  private var selectedMapRef: MapRef?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    // Each change of the selection, wherever it comes from (Open, or `goOnline`): a published
    // value's sink runs before the value is stored, so it reads the value passed in.
    selectionSubscription = model.$selection.dropFirst().removeDuplicates { $0 === $1 }.sink {
      [weak self] selection in
      self?.onSelectionChange(["isOffline": selection != nil])
    }
    let hostingController = UIHostingController(rootView: OfflineMapAreasContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The SwiftUI inside presents from its hosting controller (its sheets and alerts), which needs a
  // parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  /// Receives the nearest `<Map>`'s native object, and follows its map.
  func setGeoModel(_ ref: SharedObject?) {
    guard let mapRef = ref as? MapRef else {
      mapSubscription = nil
      model.onlineMap = nil
      return
    }
    mapSubscription = mapRef.$map.sink { [weak self] map in self?.model.onlineMap = map }
  }

  /// The offline map open, by reference; nil while the web map is online.
  func getSelectedMap() -> MapRef? {
    // Read after the change event, by when the selection is stored.
    guard let selection = model.selection else { return nil }
    if selectedMapRef?.map !== selection { selectedMapRef = MapRef(map: selection) }
    return selectedMapRef
  }

  /// Goes back to the web map online.
  func goOnline() {
    model.selection = nil
  }
}

final class OfflineMapAreasModel: ObservableObject {
  @Published var onlineMap: Map?
  @Published var selection: Map?
}

struct OfflineMapAreasContent: View {
  @ObservedObject var model: OfflineMapAreasModel

  var body: some View {
    if let map = model.onlineMap, isWebMap(map), ExpoArcgisToolkitAppDelegate.offlineManagerStarted {
      // Hidden Done button: the view isn't presented here, and its Done and Open would dismiss
      // whatever presents the screen. Open still sets the selection.
      OfflineMapAreasView(onlineMap: map, selection: $model.selection)
        .doneButton(.hidden)
        // A new map, a new view: it takes its online map when it is made.
        .id(ObjectIdentifier(map))
    }
  }

  /// The Toolkit takes only a web map from a portal item offline, and stops the app on any other.
  private func isWebMap(_ map: Map) -> Bool {
    (map.item as? PortalItem)?.id != nil
  }
}

/// Starts the Toolkit's offline manager while the app launches: its job manager registers a
/// background task, which iOS only allows then. Also hands it the background downloads' session
/// events when iOS relaunches the app for them.
public final class ExpoArcgisToolkitAppDelegate: ExpoAppDelegateSubscriber {
  /// The identifier of the offline manager's background status checks. The app's Info.plist must
  /// permit it (expo-arcgis-toolkit's config plugin adds it): iOS stops an app that registers a
  /// background task it doesn't permit.
  static let offlineStatusCheckTask = "com.esri.ArcGISToolkit.jobManager.offlineManager.statusCheck"

  /// Whether the offline manager started at launch. The offline map areas view needs it: starting
  /// it later would register its background task after launch, which iOS doesn't allow.
  static var offlineManagerStarted = false

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let permitted = Bundle.main.object(forInfoDictionaryKey: "BGTaskSchedulerPermittedIdentifiers")
      as? [String] ?? []
    if permitted.contains(Self.offlineStatusCheckTask) {
      _ = OfflineManager.shared
      Self.offlineManagerStarted = true
    }
    return true
  }

  public func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    guard identifier == ArcGISEnvironment.defaultBackgroundURLSessionIdentifier else {
      // Not the SDK's session: nothing to do, but Expo waits for every subscriber to finish.
      completionHandler()
      return
    }
    Task {
      await ArcGISEnvironment.backgroundURLSession.handleEventsForBackgroundTask()
      completionHandler()
    }
  }
}
