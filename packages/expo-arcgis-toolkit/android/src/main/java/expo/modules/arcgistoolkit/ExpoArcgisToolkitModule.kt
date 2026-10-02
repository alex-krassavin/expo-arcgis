package expo.modules.arcgistoolkit

import expo.modules.arcgis.GeoViewRef
import expo.modules.arcgis.GraphicsOverlayRef
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * ArcGIS Maps SDK Toolkit components for expo-arcgis.
 *
 * Compass, Scalebar and FloorFilter are accessories: shared objects the JS components hand to the
 * nearest `<MapView>` / `<SceneView>`, which composes them over itself (expo-arcgis's
 * `GeoViewAccessory`). BasemapGallery, Legend and UtilityNetworkTrace are views of their own.
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

    Class(FloorFilterAccessory::class) {
      Constructor { FloorFilterAccessory(appContext) }
      AsyncFunction("update") { accessory: FloorFilterAccessory, props: Map<String, Any?> ->
        accessory.update(props)
      }.runOnQueue(Queues.MAIN)
    }

    View(BasemapGalleryView::class) {
      Prop("geoModel") { view: BasemapGalleryView, ref: SharedObject? ->
        view.setGeoModel(ref)
      }
      OnViewDestroys { view: BasemapGalleryView -> view.destroy() }
    }

    View(UtilityNetworkTraceView::class) {
      // The view the trace is for: expo-arcgis's GeoViewRef of a <MapView>.
      Prop("geoView") { view: UtilityNetworkTraceView, ref: GeoViewRef? -> view.setGeoView(ref) }
      // The overlay the app declared for the trace (a <GraphicsOverlay> in the map view).
      Prop("graphicsOverlay") { view: UtilityNetworkTraceView, ref: GraphicsOverlayRef? ->
        view.setGraphicsOverlay(ref)
      }
      Prop("mapPoint") { view: UtilityNetworkTraceView, value: Map<String, Any?>? -> view.setMapPoint(value) }
      OnViewDestroys { view: UtilityNetworkTraceView -> view.destroy() }
    }

    View(LegendView::class) {
      // The view the legend is for: expo-arcgis's GeoViewRef of a <MapView> / <SceneView>.
      Prop("geoView") { view: LegendView, ref: GeoViewRef? -> view.setGeoView(ref) }
      Prop("reverseLayerOrder") { view: LegendView, value: Boolean? -> view.setReverseLayerOrder(value) }
      Prop("respectScaleRange") { view: LegendView, value: Boolean? -> view.setRespectScaleRange(value) }
      Prop("title") { view: LegendView, value: String? -> view.setTitle(value) }
      Prop("typography") { view: LegendView, value: Map<String, Any?>? -> view.setTypography(value) }
      OnViewDestroys { view: LegendView -> view.destroy() }
    }
  }
}
