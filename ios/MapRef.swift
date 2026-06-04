import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native ArcGIS `Map`. Constructed and reconciled declaratively from the
/// JS `<Map>` component; the `<MapView>` reads `map` by reference to render it.
public final class MapRef: SharedObject {
  let map: Map = Map()

  /// Generic setter dispatched by key — applies only the changed props sent from JS.
  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "basemap":
        if let name = value as? String {
          map.basemap = Basemap(style: basemapStyle(from: name))
        }
      case "initialViewpoint":
        if let vp = value as? [String: Any],
           let lat = (vp["latitude"] as? NSNumber)?.doubleValue,
           let lon = (vp["longitude"] as? NSNumber)?.doubleValue,
           let scale = (vp["scale"] as? NSNumber)?.doubleValue {
          map.initialViewpoint = Viewpoint(latitude: lat, longitude: lon, scale: scale)
        }
      default:
        break
      }
    }
  }

  func addLayer(_ ref: LayerRef) {
    map.addOperationalLayer(ref.layer)
  }

  func removeLayer(_ ref: LayerRef) {
    map.removeOperationalLayer(ref.layer)
  }
}

/// Maps the JS basemap style union to the native `Basemap.Style`. Unknown → topographic.
func basemapStyle(from style: String?) -> Basemap.Style {
  switch style {
  case "arcGISImagery": return .arcGISImagery
  case "arcGISImageryStandard": return .arcGISImageryStandard
  case "arcGISTopographic": return .arcGISTopographic
  case "arcGISStreets": return .arcGISStreets
  case "arcGISStreetsNight": return .arcGISStreetsNight
  case "arcGISNavigation": return .arcGISNavigation
  case "arcGISNavigationNight": return .arcGISNavigationNight
  case "arcGISTerrain": return .arcGISTerrain
  case "arcGISLightGray": return .arcGISLightGray
  case "arcGISDarkGray": return .arcGISDarkGray
  case "arcGISOceans": return .arcGISOceans
  default: return .arcGISTopographic
  }
}
