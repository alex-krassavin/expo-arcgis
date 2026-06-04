package expo.modules.arcgis

import com.arcgismaps.mapping.ArcGISMap
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.BasemapStyle
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.portal.Portal
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * SharedObject wrapping a native [ArcGISMap]. Constructed and reconciled declaratively from the
 * JS `<Map>` component; the `<MapView>` reads [map] by reference to render it.
 */
class MapRef(appContext: AppContext, portalItem: Map<String, Any?>? = null) : SharedObject(appContext) {
  val map: ArcGISMap = buildMap(portalItem)

  /** Generic setter dispatched by key — applies only the changed props sent from JS. */
  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "basemap" -> (value as? String)?.let { name ->
          basemapStyleFromString(name)?.let { style -> map.setBasemap(Basemap(style)) }
        }
        "initialViewpoint" -> (value as? Map<*, *>)?.let { vp ->
          val lat = (vp["latitude"] as? Number)?.toDouble()
          val lon = (vp["longitude"] as? Number)?.toDouble()
          val scale = (vp["scale"] as? Number)?.toDouble()
          if (lat != null && lon != null && scale != null) {
            map.initialViewpoint = Viewpoint(lat, lon, scale)
          }
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

/** Builds the map from a portal item (web map) when provided, otherwise an empty map. */
private fun buildMap(portalItem: Map<String, Any?>?): ArcGISMap {
  portalItem ?: return ArcGISMap()
  val itemId = portalItem["itemId"] as? String ?: return ArcGISMap()
  val portalUrl = portalItem["portalUrl"] as? String ?: "https://www.arcgis.com"
  return ArcGISMap(PortalItem(Portal(portalUrl, Portal.Connection.Anonymous), itemId))
}
