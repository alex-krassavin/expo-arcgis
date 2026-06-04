package expo.modules.arcgis

import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.Viewpoint
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/** SharedObject wrapping a native [ArcGISScene] (3D). Mirrors [MapRef]. */
class SceneRef(appContext: AppContext) : SharedObject(appContext) {
  val scene = ArcGISScene()

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
