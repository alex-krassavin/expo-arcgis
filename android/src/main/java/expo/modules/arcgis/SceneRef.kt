package expo.modules.arcgis

import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.ArcGISTiledElevationSource
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.mapping.Surface
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.portal.Portal
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/** SharedObject wrapping a native [ArcGISScene] (3D). Mirrors [MapRef]. */
class SceneRef(appContext: AppContext, portalItem: Map<String, Any?>? = null) : SharedObject(appContext) {
  val scene: ArcGISScene = buildScene(portalItem)

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "basemap" -> (value as? String)?.let { name ->
          basemapStyleFromString(name)?.let { style -> scene.setBasemap(Basemap(style)) }
        }
        "initialViewpoint" -> (value as? Map<*, *>)?.let { vp ->
          val lat = (vp["latitude"] as? Number)?.toDouble()
          val lon = (vp["longitude"] as? Number)?.toDouble()
          val scale = (vp["scale"] as? Number)?.toDouble()
          if (lat != null && lon != null && scale != null) {
            scene.initialViewpoint = Viewpoint(lat, lon, scale)
          }
        }
        "surface" -> (value as? Map<*, *>)?.let { scene.baseSurface = buildSurface(it) }
        "camera" -> (value as? Map<*, *>)?.let { c ->
          (c["position"] as? Map<*, *>)?.let { position ->
            val point = scenePoint(position)
            val camera = Camera(
              point,
              (c["heading"] as? Number)?.toDouble() ?: 0.0,
              (c["pitch"] as? Number)?.toDouble() ?: 0.0,
              (c["roll"] as? Number)?.toDouble() ?: 0.0,
            )
            scene.initialViewpoint = Viewpoint(point, camera)
          }
        }
      }
    }
  }

  fun addLayer(ref: LayerRef) {
    scene.operationalLayers.add(ref.layer)
  }

  fun removeLayer(ref: LayerRef) {
    scene.operationalLayers.remove(ref.layer)
  }
}

/** Builds a [Point] (with optional `z` altitude) from a JS dict, defaulting to WGS84. */
private fun scenePoint(p: Map<*, *>): Point {
  val x = (p["x"] as? Number)?.toDouble() ?: 0.0
  val y = (p["y"] as? Number)?.toDouble() ?: 0.0
  val z = (p["z"] as? Number)?.toDouble()
  return if (z != null) Point(x, y, z, SpatialReference.wgs84())
  else Point(x, y, SpatialReference.wgs84())
}

/** Builds a [Surface] (terrain) from a JS dict of tiled elevation sources + exaggeration. */
private fun buildSurface(s: Map<*, *>): Surface = Surface().apply {
  (s["elevationSources"] as? List<*>)?.forEach { src ->
    ((src as? Map<*, *>)?.get("url") as? String)?.let {
      elevationSources.add(ArcGISTiledElevationSource(it))
    }
  }
  (s["elevationExaggeration"] as? Number)?.toFloat()?.let { elevationExaggeration = it }
}

/** Builds the scene from a portal item (web scene) when provided, otherwise an empty scene. */
private fun buildScene(portalItem: Map<String, Any?>?): ArcGISScene {
  portalItem ?: return ArcGISScene()
  val itemId = portalItem["itemId"] as? String ?: return ArcGISScene()
  val portalUrl = portalItem["portalUrl"] as? String ?: "https://www.arcgis.com"
  return ArcGISScene(PortalItem(Portal(portalUrl, Portal.Connection.Anonymous), itemId))
}
