package expo.modules.arcgistoolkit

import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * ArcGIS Maps SDK Toolkit components for expo-arcgis.
 *
 * Compass and Scalebar are accessories: shared objects the JS components hand to the nearest
 * `<MapView>`, which composes them over the map (expo-arcgis's `GeoViewAccessory`). BasemapGallery
 * is a view of its own.
 */
class ExpoArcgisToolkitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArcgisToolkit")

    Class(CompassAccessory::class) {
      Constructor { CompassAccessory(appContext) }
      AsyncFunction("update") { accessory: CompassAccessory, props: Map<String, Any?> ->
        accessory.update(props)
      }.runOnQueue(Queues.MAIN)
    }

    Class(ScalebarAccessory::class) {
      Constructor { ScalebarAccessory(appContext) }
      AsyncFunction("update") { accessory: ScalebarAccessory, props: Map<String, Any?> ->
        accessory.update(props)
      }.runOnQueue(Queues.MAIN)
    }

    View(BasemapGalleryView::class) {
      Prop("geoModel") { view: BasemapGalleryView, ref: SharedObject? ->
        view.setGeoModel(ref)
      }
      OnViewDestroys { view: BasemapGalleryView -> view.destroy() }
    }
  }
}
