import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native ArcGIS `Scene` (3D). Mirrors `MapRef`.
/// `Scene` is qualified as `ArcGIS.Scene` because `ExpoModulesCore` re-exports SwiftUI,
/// whose `SwiftUI.Scene` (the app-scene protocol) otherwise collides with the ArcGIS type.
public final class SceneRef: SharedObject {
  let scene: ArcGIS.Scene

  /// Builds the scene from a portal item (web scene) when provided, otherwise an empty scene.
  init(portalItem: [String: Any]?) {
    if let portalItem,
       let itemId = portalItem["itemId"] as? String,
       let id = PortalItem.ID(itemId) {
      let portal: Portal
      if let urlString = portalItem["portalUrl"] as? String, let url = URL(string: urlString) {
        portal = Portal(url: url, connection: .anonymous)
      } else {
        portal = .arcGISOnline(connection: .anonymous)
      }
      scene = ArcGIS.Scene(item: PortalItem(portal: portal, id: id))
    } else {
      scene = ArcGIS.Scene()
    }
    super.init()
  }

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
      case "surface":
        if let s = value as? [String: Any] {
          scene.baseSurface = buildSurface(s)
        }
      case "camera":
        if let c = value as? [String: Any], let position = c["position"] as? [String: Any] {
          let point = scenePoint(position)
          let camera = Camera(
            location: point,
            heading: (c["heading"] as? NSNumber)?.doubleValue ?? 0,
            pitch: (c["pitch"] as? NSNumber)?.doubleValue ?? 0,
            roll: (c["roll"] as? NSNumber)?.doubleValue ?? 0
          )
          scene.initialViewpoint = Viewpoint(boundingGeometry: point, camera: camera)
        }
      default:
        break
      }
    }
  }

  func addLayer(_ ref: LayerRef) {
    scene.addOperationalLayer(ref.layer)
  }

  func removeLayer(_ ref: LayerRef) {
    scene.removeOperationalLayer(ref.layer)
  }
}

/// Builds a `Point` (with optional `z` altitude) from a JS dict, defaulting to WGS84.
func scenePoint(_ p: [String: Any]) -> Point {
  let x = (p["x"] as? NSNumber)?.doubleValue ?? 0
  let y = (p["y"] as? NSNumber)?.doubleValue ?? 0
  if let z = (p["z"] as? NSNumber)?.doubleValue {
    return Point(x: x, y: y, z: z, spatialReference: .wgs84)
  }
  return Point(x: x, y: y, spatialReference: .wgs84)
}

/// Builds a `Surface` (terrain) from a JS dict of tiled elevation sources + exaggeration.
func buildSurface(_ s: [String: Any]) -> Surface {
  let surface = Surface()
  if let sources = s["elevationSources"] as? [[String: Any]] {
    for src in sources {
      if let url = src["url"] as? String, let u = URL(string: url) {
        surface.addElevationSource(ArcGISTiledElevationSource(url: u))
      }
    }
  }
  if let exaggeration = (s["elevationExaggeration"] as? NSNumber)?.floatValue {
    surface.elevationExaggeration = exaggeration
  }
  return surface
}
