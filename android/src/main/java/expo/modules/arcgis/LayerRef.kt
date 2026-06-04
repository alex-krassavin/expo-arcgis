package expo.modules.arcgis

import com.arcgismaps.data.ServiceFeatureTable
import com.arcgismaps.mapping.layers.ArcGISMapImageLayer
import com.arcgismaps.mapping.layers.ArcGISTiledLayer
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.layers.Layer
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/** Base SharedObject for an operational layer; the map reads [layer] by reference. */
abstract class LayerRef(appContext: AppContext) : SharedObject(appContext) {
  abstract val layer: Layer

  abstract fun applyProps(changed: Map<String, Any?>)

  protected fun applyCommonProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "opacity" -> (value as? Number)?.toFloat()?.let { layer.opacity = it }
        "visible" -> (value as? Boolean)?.let { layer.isVisible = it }
      }
    }
  }
}

/** Operational FeatureLayer backed by a service feature table URL. */
class FeatureLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: FeatureLayer = FeatureLayer.createWithFeatureTable(ServiceFeatureTable(url))

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational tiled layer backed by a tiled map service URL. */
class TiledLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISTiledLayer = ArcGISTiledLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational map image layer backed by a dynamic map service URL. */
class MapImageLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISMapImageLayer = ArcGISMapImageLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}
