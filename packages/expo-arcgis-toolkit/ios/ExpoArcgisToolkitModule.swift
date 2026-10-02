import ExpoArcgis
import ExpoModulesCore

/// ArcGIS Maps SDK Toolkit components for expo-arcgis.
///
/// Compass, Scalebar, OverviewMap, LocationButton and FloorFilter are accessories: shared objects
/// the JS components hand to the nearest `<MapView>` / `<SceneView>`, which draws them over itself
/// (expo-arcgis's `GeoViewAccessory`). BasemapGallery and Bookmarks are views of their own.
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

    View(BookmarksView.self) {
      Events("onSelectionChange", "onIsPresentedChange")
      // The view the bookmarks belong to: expo-arcgis's GeoViewRef of a <MapView> / <SceneView>.
      Prop("geoView") { (view: BookmarksView, ref: GeoViewRef?) in
        view.setGeoView(ref)
      }
      Prop("bookmarks") { (view: BookmarksView, items: [[String: Any]]?) in
        view.setBookmarks(items)
      }
    }
  }
}
