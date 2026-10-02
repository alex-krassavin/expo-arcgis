import ExpoArcgis
import ExpoModulesCore

/// ArcGIS Maps SDK Toolkit components for expo-arcgis.
///
/// Compass, Scalebar, OverviewMap, LocationButton and FloorFilter are accessories: shared objects
/// the JS components hand to the nearest `<MapView>` / `<SceneView>`, which draws them over itself
/// (expo-arcgis's `GeoViewAccessory`). BasemapGallery, Bookmarks, BuildingExplorer, Search and
/// UtilityNetworkTrace are views of their own.
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

    View(BuildingExplorerView.self) {
      Events("onSelectionChange")
      // The view the explorer is for: expo-arcgis's GeoViewRef of a <LocalSceneView>.
      Prop("geoView") { (view: BuildingExplorerView, ref: GeoViewRef?) in view.setGeoView(ref) }
    }

    View(UtilityNetworkTraceView.self) {
      // The view the trace is for: expo-arcgis's GeoViewRef of a <MapView>.
      Prop("geoView") { (view: UtilityNetworkTraceView, ref: GeoViewRef?) in view.setGeoView(ref) }
      // The overlay the app declared for the trace (a <GraphicsOverlay> in the map view).
      Prop("graphicsOverlay") { (view: UtilityNetworkTraceView, ref: GraphicsOverlayRef?) in
        view.setGraphicsOverlay(ref)
      }
      Prop("mapPoint") { (view: UtilityNetworkTraceView, value: [String: Any]?) in
        view.setMapPoint(value)
      }
    }

    View(SearchPanelView.self) {
      Events("onQueryChange")
      // The view the search is for: expo-arcgis's GeoViewRef of a <MapView> / <SceneView>.
      Prop("geoView") { (view: SearchPanelView, ref: GeoViewRef?) in view.setGeoView(ref) }
      Prop("sources") { (view: SearchPanelView, items: [[String: Any]]?) in view.setSources(items) }
      // The overlay the app declared for the results (a <GraphicsOverlay> in the view).
      Prop("resultsOverlay") { (view: SearchPanelView, ref: GraphicsOverlayRef?) in
        view.setResultsOverlay(ref)
      }
      Prop("enableResultListView") { (view: SearchPanelView, value: Bool?) in
        view.setEnableResultListView(value)
      }
      Prop("prompt") { (view: SearchPanelView, value: String?) in view.setPrompt(value) }
      Prop("noResultsMessage") { (view: SearchPanelView, value: String?) in
        view.setNoResultsMessage(value)
      }
      Prop("currentQuery") { (view: SearchPanelView, value: String?) in view.setCurrentQuery(value) }
      Prop("resultMode") { (view: SearchPanelView, value: String?) in view.setResultMode(value) }
      Prop("repeatSearch") { (view: SearchPanelView, value: Bool?) in view.setRepeatSearch(value) }
      Prop("queryCenterFromView") { (view: SearchPanelView, value: Bool?) in
        view.setQueryCenterFromView(value)
      }
      Prop("queryCenter") { (view: SearchPanelView, value: [String: Any]?) in
        view.setQueryCenter(value)
      }
    }
  }
}
