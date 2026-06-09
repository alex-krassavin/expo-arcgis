package expo.modules.arcgis

import com.arcgismaps.geometry.Envelope
import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.BasemapStyle
import com.arcgismaps.mapping.BasemapStyleLanguageStrategy
import com.arcgismaps.mapping.BasemapStyleParameters
import com.arcgismaps.mapping.MobileMapPackage
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.Worldview
import com.arcgismaps.portal.Portal
import java.util.Locale
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * SharedObject wrapping a native [ArcGISMap]. Constructed and reconciled declaratively from the
 * JS `<Map>` component; the `<MapView>` reads [map] by reference to render it.
 */
class MapRef(appContext: AppContext, portalItem: Map<String, Any?>? = null) : SharedObject(appContext) {
  var map: ArcGISMap = buildMap(portalItem)
    private set

  /** Called when [map] is replaced asynchronously (e.g. after a mobile map package finishes loading). */
  var onMapChanged: ((ArcGISMap) -> Unit)? = null
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  /** Tracks the last applied basemap style/language/worldview to rebuild when any of them changes. */
  private var currentBasemapStyle: String? = null
  private var currentBasemapLanguage: String? = null
  private var currentBasemapWorldview: String? = null

  /** Generic setter dispatched by key — applies only the changed props sent from JS. */
  fun applyProps(changed: Map<String, Any?>) {
    // Collect basemap-related changes first, then rebuild once if any changed.
    var basemapDirty = false
    if (changed.containsKey("basemap")) {
      currentBasemapStyle = changed["basemap"] as? String
      basemapDirty = true
    }
    if (changed.containsKey("basemapLanguage")) {
      currentBasemapLanguage = changed["basemapLanguage"] as? String
      basemapDirty = true
    }
    if (changed.containsKey("basemapWorldview")) {
      currentBasemapWorldview = changed["basemapWorldview"] as? String
      basemapDirty = true
    }
    if (basemapDirty) {
      currentBasemapStyle?.let { styleName ->
        basemapStyleFromString(styleName)?.let { style ->
          map.setBasemap(buildBasemap(style, currentBasemapLanguage, currentBasemapWorldview))
        }
      }
    }

    changed.forEach { (key, value) ->
      when (key) {
        "basemap", "basemapLanguage", "basemapWorldview" -> Unit // already handled above
        "initialViewpoint" -> (value as? Map<*, *>)?.let { vp ->
          val lat = (vp["latitude"] as? Number)?.toDouble()
          val lon = (vp["longitude"] as? Number)?.toDouble()
          val scale = (vp["scale"] as? Number)?.toDouble()
          if (lat != null && lon != null && scale != null) {
            map.initialViewpoint = Viewpoint(lat, lon, scale)
          }
        }
        "mobileMapPackagePath" -> (value as? String)?.let { loadMobileMapPackage(it) }
        "referenceScale" -> (value as? Number)?.let { map.referenceScale = it.toDouble() }
        "maxExtent" -> (value as? Map<*, *>)?.let { dict ->
          (geometryFromDict(dict) as? Envelope)?.let { map.maxExtent = it }
        }
      }
    }
  }

  /** Loads a mobile map package (`.mmpk`) off the main thread and swaps in its first map when ready. */
  private fun loadMobileMapPackage(path: String) {
    scope.launch {
      val pkg = MobileMapPackage(path)
      pkg.load().onSuccess {
        pkg.maps.firstOrNull()?.let { first ->
          map = first
          onMapChanged?.invoke(first)
        }
      }
    }
  }

  fun addLayer(ref: LayerRef) {
    map.operationalLayers.add(ref.layer)
  }

  fun removeLayer(ref: LayerRef) {
    map.operationalLayers.remove(ref.layer)
  }
}

/** Maps the JS basemap style union to native sealed-class instances. Unknown → null. */
internal fun basemapStyleFromString(style: String?): BasemapStyle? = when (style) {
  "arcGISImagery" -> BasemapStyle.ArcGISImagery
  "arcGISImageryStandard" -> BasemapStyle.ArcGISImageryStandard
  "arcGISTopographic" -> BasemapStyle.ArcGISTopographic
  "arcGISStreets" -> BasemapStyle.ArcGISStreets
  "arcGISStreetsNight" -> BasemapStyle.ArcGISStreetsNight
  "arcGISNavigation" -> BasemapStyle.ArcGISNavigation
  "arcGISNavigationNight" -> BasemapStyle.ArcGISNavigationNight
  "arcGISTerrain" -> BasemapStyle.ArcGISTerrain
  "arcGISLightGray" -> BasemapStyle.ArcGISLightGray
  "arcGISDarkGray" -> BasemapStyle.ArcGISDarkGray
  "arcGISOceans" -> BasemapStyle.ArcGISOceans
  else -> null
}

/**
 * Builds a [Basemap] from a [BasemapStyle] plus optional language and worldview codes.
 * When neither is set, returns a plain `Basemap(style)`.
 * Language codes: `"global"`, `"local"`, `"default"`, `"applicationLocale"`, or a BCP-47 tag
 * (e.g. `"fr"`, `"zh-Hans"`) which maps to `BasemapStyleLanguageStrategy.Specific(Locale)`.
 */
internal fun buildBasemap(style: BasemapStyle, language: String?, worldview: String?): Basemap {
  if (language == null && worldview == null) return Basemap(style)
  val params = BasemapStyleParameters()
  if (language != null) {
    params.languageStrategy = when (language) {
      "global" -> BasemapStyleLanguageStrategy.Global
      "local" -> BasemapStyleLanguageStrategy.Local
      "default" -> BasemapStyleLanguageStrategy.Default
      "applicationLocale" -> BasemapStyleLanguageStrategy.ApplicationLocale
      else -> BasemapStyleLanguageStrategy.Specific(Locale.forLanguageTag(language))
    }
  }
  if (worldview != null) {
    params.worldview = Worldview(worldview)
  }
  return Basemap(style, params)
}

/** Builds the map from a portal item (web map) when provided, otherwise an empty map. */
private fun buildMap(portalItem: Map<String, Any?>?): ArcGISMap {
  portalItem ?: return ArcGISMap()
  val itemId = portalItem["itemId"] as? String ?: return ArcGISMap()
  val portalUrl = portalItem["portalUrl"] as? String ?: "https://www.arcgis.com"
  return ArcGISMap(PortalItem(Portal(portalUrl, Portal.Connection.Anonymous), itemId))
}
