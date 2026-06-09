import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native ArcGIS `Scene` (3D). Mirrors `MapRef`.
/// `Scene` is qualified as `ArcGIS.Scene` because `ExpoModulesCore` re-exports SwiftUI,
/// whose `SwiftUI.Scene` (the app-scene protocol) otherwise collides with the ArcGIS type.
public final class SceneRef: SharedObject {
  private(set) var scene: ArcGIS.Scene
  /// Called when `scene` is replaced asynchronously (e.g. after a mobile scene package loads).
  var onSceneChanged: ((ArcGIS.Scene) -> Void)?

  /// Tracks the last applied basemap style name so we can rebuild when language/worldview changes.
  private var currentBasemapStyle: String?
  private var currentBasemapLanguage: String?
  private var currentBasemapWorldview: String?

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
    // Collect basemap-related prop changes before iterating so we can rebuild once.
    var basemapDirty = false
    if let name = changed["basemap"] as? String {
      currentBasemapStyle = name
      basemapDirty = true
    }
    if let lang = changed["basemapLanguage"] as? String {
      currentBasemapLanguage = lang
      basemapDirty = true
    }
    if changed.keys.contains("basemapWorldview") {
      currentBasemapWorldview = changed["basemapWorldview"] as? String
      basemapDirty = true
    }
    if basemapDirty, let styleName = currentBasemapStyle {
      scene.basemap = buildBasemap(styleName: styleName,
                                   language: currentBasemapLanguage,
                                   worldview: currentBasemapWorldview)
    }

    for (key, value) in changed {
      switch key {
      case "basemap", "basemapLanguage", "basemapWorldview":
        break // already handled above
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
      case "bookmarks":
        if let entries = value as? [[String: Any]] {
          scene.removeAllBookmarks()
          for entry in entries {
            guard let name = entry["name"] as? String,
                  let vp = entry["viewpoint"] as? [String: Any],
                  let lat = (vp["latitude"] as? NSNumber)?.doubleValue,
                  let lon = (vp["longitude"] as? NSNumber)?.doubleValue,
                  let scale = (vp["scale"] as? NSNumber)?.doubleValue else { continue }
            scene.addBookmark(Bookmark(name: name, viewpoint: Viewpoint(latitude: lat, longitude: lon, scale: scale)))
          }
        }
      case "mobileScenePackagePath":
        if let path = value as? String { loadMobileScenePackage(path) }
      default:
        break
      }
    }
  }

  /// Loads a mobile scene package (`.mspk`) off the main thread and swaps in its first scene.
  private func loadMobileScenePackage(_ path: String) {
    Task { [weak self] in
      let package = MobileScenePackage(fileURL: URL(fileURLWithPath: path))
      try? await package.load()
      guard let self, let first = package.scenes.first else { return }
      self.scene = first
      self.onSceneChanged?(first)
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
