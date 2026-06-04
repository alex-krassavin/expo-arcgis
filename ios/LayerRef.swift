import ArcGIS
import ExpoModulesCore

/// Base SharedObject for an operational layer; the map reads `layer` by reference.
public class LayerRef: SharedObject {
  let layer: Layer

  init(layer: Layer) {
    self.layer = layer
    super.init()
  }

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "opacity":
        if let n = value as? NSNumber { layer.opacity = n.floatValue }
      case "visible":
        if let b = value as? Bool { layer.isVisible = b }
      default:
        break
      }
    }
  }
}

/// Operational FeatureLayer backed by a service feature table URL.
public final class FeatureLayerRef: LayerRef {
  init(url: String) {
    let table = ServiceFeatureTable(url: URL(string: url)!)
    super.init(layer: FeatureLayer(featureTable: table))
  }
}

/// Operational tiled layer backed by a tiled map service URL.
public final class TiledLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISTiledLayer(url: URL(string: url)!))
  }
}

/// Operational map image layer backed by a dynamic map service URL.
public final class MapImageLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISMapImageLayer(url: URL(string: url)!))
  }
}
