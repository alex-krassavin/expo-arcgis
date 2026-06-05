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

/// Operational 3D scene layer (3D objects / integrated mesh) backed by a scene service URL.
public final class SceneLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISSceneLayer(url: URL(string: url)!))
  }
}

/// Operational vector tiled layer backed by a vector tile service URL.
public final class VectorTiledLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISVectorTiledLayer(url: URL(string: url)!))
  }
}

/// Operational 3D integrated mesh layer backed by a scene service URL.
public final class IntegratedMeshLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: IntegratedMeshLayer(url: URL(string: url)!))
  }
}

/// Operational 3D point cloud layer backed by a scene service URL.
public final class PointCloudLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: PointCloudLayer(url: URL(string: url)!))
  }
}

/// Operational OGC 3D Tiles layer backed by a 3D Tiles service URL.
public final class Ogc3DTilesLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: OGC3DTilesLayer(url: URL(string: url)!))
  }
}

/// Operational web tiled layer backed by a `{level}/{row}/{col}` URL template.
public final class WebTiledLayerRef: LayerRef {
  init(urlTemplate: String) {
    super.init(layer: WebTiledLayer(urlTemplate: urlTemplate))
  }
}

/// Operational OpenStreetMap tiled layer.
public final class OpenStreetMapLayerRef: LayerRef {
  init() {
    super.init(layer: OpenStreetMapLayer())
  }
}

/// Operational WMS layer (Web Map Service) backed by a service URL + visible layer names.
public final class WmsLayerRef: LayerRef {
  init(url: String, layerNames: [String]) {
    super.init(layer: WMSLayer(url: URL(string: url)!, layerNames: layerNames))
  }
}

/// Operational WMTS layer (Web Map Tile Service) backed by a service URL + layer id.
public final class WmtsLayerRef: LayerRef {
  init(url: String, layerID: String) {
    super.init(layer: WMTSLayer(url: URL(string: url)!, layerID: layerID))
  }
}

/// Operational raster layer from a remote image service or a local raster file.
public final class RasterLayerRef: LayerRef {
  init(source: [String: Any]) {
    super.init(layer: RasterLayer(raster: rasterFromSource(source)))
  }
}

/// Builds a `Raster` from a JS source dict: `{ type: "imageService", url }` or `{ type: "file", path }`.
func rasterFromSource(_ s: [String: Any]) -> Raster {
  if (s["type"] as? String) == "file", let path = s["path"] as? String {
    return Raster(fileURL: URL(fileURLWithPath: path))
  }
  return ImageServiceRaster(url: URL(string: s["url"] as? String ?? "")!)
}

/// Operational KML layer from a remote `.kml`/`.kmz` URL or local file.
public final class KmlLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: KMLLayer(dataset: KMLDataset(url: URL(string: url)!)))
  }
}
