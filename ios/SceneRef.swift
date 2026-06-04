import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native ArcGIS `Scene` (3D). Mirrors `MapRef`.
public final class SceneRef: SharedObject {
  let scene: Scene = Scene()

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "basemap":
        if let name = value as? String {
          scene.basemap = Basemap(style: basemapStyle(from: name))
        }
      case "initialViewpoint":
        if let vp = value as? [String: Any],
           let lat = (vp["latitude"] as? NSNumber)?.doubleValue,
           let lon = (vp["longitude"] as? NSNumber)?.doubleValue,
           let scale = (vp["scale"] as? NSNumber)?.doubleValue {
          scene.initialViewpoint = Viewpoint(latitude: lat, longitude: lon, scale: scale)
        }
      default:
        break
      }
    }
  }

  func addLayer(_ ref: LayerRef) {
    scene.operationalLayers.append(ref.layer)
  }

  func removeLayer(_ ref: LayerRef) {
    scene.operationalLayers.removeAll { $0 === ref.layer }
  }
}
