import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native ArcGIS `Map`. Constructed and reconciled declaratively from the
/// JS `<Map>` component; the `<MapView>` reads `map` by reference to render it.
public final class MapRef: SharedObject {
  private(set) var map: Map
  /// Called when `map` is replaced asynchronously (e.g. after a mobile map package finishes loading).
  var onMapChanged: ((Map) -> Void)?

  /// Tracks the last applied basemap style name so we can rebuild when language/worldview changes.
  private var currentBasemapStyle: String?
  private var currentBasemapLanguage: String?
  private var currentBasemapWorldview: String?

  /// Builds the map from a portal item (web map) when provided, otherwise an empty map.
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
      map = Map(item: PortalItem(portal: portal, id: id))
    } else {
      map = Map()
    }
    super.init()
  }

  /// Generic setter dispatched by key — applies only the changed props sent from JS.
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
      map.basemap = buildBasemap(styleName: styleName,
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
          map.initialViewpoint = Viewpoint(latitude: lat, longitude: lon, scale: scale)
        }
      case "mobileMapPackagePath":
        if let path = value as? String { loadMobileMapPackage(path) }
      case "referenceScale":
        if let n = value as? NSNumber {
          let v = n.doubleValue
          // 0 means "no reference scale" — pass nil to the SDK
          map.referenceScale = v == 0 ? nil : v
        }
      case "maxExtent":
        if let dict = value as? [String: Any] {
          map.maxExtent = geometryFromDict(dict) as? Envelope
        }
      default:
        break
      }
    }
  }

  /// Loads a mobile map package (`.mmpk`) off the main thread and swaps in its first map when ready.
  private func loadMobileMapPackage(_ path: String) {
    Task { [weak self] in
      let package = MobileMapPackage(fileURL: URL(fileURLWithPath: path))
      try? await package.load()
      guard let self, let first = package.maps.first else { return }
      self.map = first
      self.onMapChanged?(first)
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

/// Builds a `Basemap` from a style name, optional language code, and optional worldview code.
/// When neither `language` nor `worldview` are set, returns a plain `Basemap(style:)`.
/// Language codes: `"global"`, `"local"`, `"default"`, `"applicationLocale"`, or any BCP-47 tag
/// (e.g. `"fr"`, `"zh-Hans"`). Worldview codes correspond to `Worldview(code:)` on the SDK.
func buildBasemap(styleName: String, language: String?, worldview: String?) -> Basemap {
  let style = basemapStyle(from: styleName)
  guard language != nil || worldview != nil else {
    return Basemap(style: style)
  }
  let params = BasemapStyleParameters()
  if let lang = language {
    let basemapLanguage: BasemapStyleLanguage
    switch lang {
    case "global":
      basemapLanguage = .strategic(.global)
    case "local":
      basemapLanguage = .strategic(.local)
    case "default":
      basemapLanguage = .strategic(.default)
    case "applicationLocale":
      basemapLanguage = .strategic(.applicationLocale)
    default:
      // Treat as a BCP-47 language tag (e.g. "fr", "zh-Hans").
      basemapLanguage = .specific(Locale.Language(identifier: lang))
    }
    params.language = basemapLanguage
  }
  if let wv = worldview {
    params.worldview = Worldview(code: wv)
  }
  return Basemap(style: style, parameters: params)
}
