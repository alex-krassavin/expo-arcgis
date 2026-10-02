import ArcGIS
import ExpoModulesCore

/// An identified feature by reference: the native feature behind one of `identify`'s results, for
/// components that work on the feature itself (expo-arcgis-toolkit's feature form) and for
/// `getLayer()`.
public final class FeatureRef: SharedObject {
  /// The native feature, for packages built on expo-arcgis.
  public let feature: Feature

  init(feature: Feature) {
    self.feature = feature
    super.init()
  }

  /// The feature layer the feature belongs to, as a new handle to it; nil when the feature isn't a
  /// feature layer's.
  func getLayer() -> FeatureLayerRef? {
    guard let layer = feature.table?.layer as? FeatureLayer else { return nil }
    return FeatureLayerRef(layer: layer)
  }
}

/// An identified popup by reference: the native popup behind one of `identifyPopups`'s results,
/// for components that show it (expo-arcgis-toolkit's popup view).
public final class PopupRef: SharedObject {
  /// The native popup, for packages built on expo-arcgis.
  public let popup: Popup

  init(popup: Popup) {
    self.popup = popup
    super.init()
  }
}
