package expo.modules.arcgis

import com.arcgismaps.data.Feature
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.popup.Popup
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * An identified feature by reference: the native feature behind one of `identify`'s results, for
 * components that work on the feature itself (expo-arcgis-toolkit's feature form) and for
 * [getLayer].
 */
class FeatureRef(private val context: AppContext, val feature: Feature) : SharedObject(context) {
  /** The feature layer the feature belongs to, as a new handle to it; null when it isn't a layer's. */
  fun getLayer(): FeatureLayerRef? =
    (feature.featureTable?.layer as? FeatureLayer)?.let { FeatureLayerRef(context, it) }
}

/**
 * An identified popup by reference: the native popup behind one of `identifyPopups`'s results, for
 * components that show it (expo-arcgis-toolkit's popup view).
 */
class PopupRef(context: AppContext, val popup: Popup) : SharedObject(context)
