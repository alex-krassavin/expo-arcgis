import ExpoModulesCore

/// ArcGIS Maps SDK Toolkit components for expo-arcgis.
///
/// Compass, Scalebar, OverviewMap, LocationButton and FloorFilter are accessories: shared objects
/// the JS components hand to the nearest `<MapView>` / `<SceneView>`, which draws them over itself
/// (expo-arcgis's `GeoViewAccessory`). BasemapGallery is a view of its own.
public class ExpoArcgisToolkitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgisToolkit")

    Class(CompassAccessory.self) {
      Constructor { CompassAccessory() }
      AsyncFunction("update") { (accessory: CompassAccessory, props: [String: Any]) in
        accessory.update(props)
      }.runOnQueue(.main)
    }

    Class(ScalebarAccessory.self) {
      Constructor { ScalebarAccessory() }
      AsyncFunction("update") { (accessory: ScalebarAccessory, props: [String: Any]) in
        accessory.update(props)
      }.runOnQueue(.main)
    }

    Class(OverviewMapAccessory.self) {
      Constructor { OverviewMapAccessory() }
      AsyncFunction("update") { (accessory: OverviewMapAccessory, props: [String: Any]) in
        accessory.update(props)
      }.runOnQueue(.main)
    }

    Class(LocationButtonAccessory.self) {
      Constructor { LocationButtonAccessory() }
      AsyncFunction("update") { (accessory: LocationButtonAccessory, props: [String: Any]) in
        accessory.update(props)
      }.runOnQueue(.main)
    }

    Class(FloorFilterAccessory.self) {
      Constructor { FloorFilterAccessory() }
      AsyncFunction("update") { (accessory: FloorFilterAccessory, props: [String: Any]) in
        accessory.update(props)
      }.runOnQueue(.main)
    }

    View(BasemapGalleryView.self) {
      Prop("geoModel") { (view: BasemapGalleryView, ref: SharedObject?) in
        view.setGeoModel(ref)
      }
    }
  }
}
