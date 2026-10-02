import ArcGIS
import ArcGISToolkit
import Combine
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `BasemapGallery` for the nearest `<Map>`: ArcGIS Online's developer basemaps (the
/// gallery's default when it is given no items); picking one sets the map's basemap.
final class BasemapGalleryView: ExpoView {
  private let model = BasemapGalleryModel()
  private var hostingController: UIHostingController<BasemapGalleryContent>?
  private var mapSubscription: AnyCancellable?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    let hostingController = UIHostingController(rootView: BasemapGalleryContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  /// Receives the nearest `<Map>`'s native object, and follows it when its map is replaced (a mobile
  /// map package loads asynchronously).
  func setGeoModel(_ ref: SharedObject?) {
    guard let mapRef = ref as? MapRef else {
      mapSubscription = nil
      model.map = nil
      return
    }
    mapSubscription = mapRef.$map.sink { [weak self] map in self?.model.map = map }
  }
}

final class BasemapGalleryModel: ObservableObject {
  @Published var map: Map?
}

struct BasemapGalleryContent: View {
  @ObservedObject var model: BasemapGalleryModel

  var body: some View {
    if let map = model.map {
      BasemapGallery(geoModel: map)
        // A replaced map gets a gallery of its own.
        .id(ObjectIdentifier(map))
    }
  }
}
