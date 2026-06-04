import ArcGIS
import ExpoModulesCore

public class ExpoArcgisModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgis")

    OnCreate {
      // Pick up an API key injected at build time by the config plugin (Info.plist).
      if let key = readApiKeyFromInfoPlist() {
        ArcGISEnvironment.apiKey = APIKey(key)
      }
    }

    Function("setApiKey") { (apiKey: String) in
      ArcGISEnvironment.apiKey = APIKey(apiKey)
    }

    // Declarative map model — a SharedObject the JS <Map> constructs and reconciles.
    Class(MapRef.self) {
      Constructor { (props: [String: Any]?) -> MapRef in
        let ref = MapRef()
        if let props {
          ref.applyProps(props)
        }
        return ref
      }

      Function("applyProps") { (ref: MapRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }

      Function("addLayer") { (ref: MapRef, layer: LayerRef) in
        ref.addLayer(layer)
      }

      Function("removeLayer") { (ref: MapRef, layer: LayerRef) in
        ref.removeLayer(layer)
      }
    }

    // Declarative 3D scene model — a SharedObject the JS <Scene> constructs and reconciles.
    Class(SceneRef.self) {
      Constructor { (props: [String: Any]?) -> SceneRef in
        let ref = SceneRef()
        if let props {
          ref.applyProps(props)
        }
        return ref
      }
      Function("applyProps") { (ref: SceneRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
      Function("addLayer") { (ref: SceneRef, layer: LayerRef) in
        ref.addLayer(layer)
      }
      Function("removeLayer") { (ref: SceneRef, layer: LayerRef) in
        ref.removeLayer(layer)
      }
    }

    // Operational layers — SharedObjects the JS <FeatureLayer>/<TileLayer> construct.
    Class(FeatureLayerRef.self) {
      Constructor { (props: [String: Any]) -> FeatureLayerRef in
        let ref = FeatureLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: FeatureLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(TiledLayerRef.self) {
      Constructor { (props: [String: Any]) -> TiledLayerRef in
        let ref = TiledLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: TiledLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    // Graphics overlay (owned by a MapView) and the graphics drawn on it.
    Class(GraphicsOverlayRef.self) {
      Constructor { () -> GraphicsOverlayRef in GraphicsOverlayRef() }
      Function("addGraphic") { (ref: GraphicsOverlayRef, graphic: GraphicRef) in
        ref.addGraphic(graphic)
      }
      Function("removeGraphic") { (ref: GraphicsOverlayRef, graphic: GraphicRef) in
        ref.removeGraphic(graphic)
      }
    }

    Class(GraphicRef.self) {
      Constructor { (props: [String: Any]) -> GraphicRef in
        let ref = GraphicRef()
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: GraphicRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    // 2D map host — receives the map + graphics overlay SharedObjects as props.
    View(ExpoArcgisMapView.self) {
      Events("onMapLoaded", "onMapLoadError", "onTap")

      Prop("map") { (view: ExpoArcgisMapView, ref: MapRef?) in
        view.setMap(ref)
      }

      Prop("graphicsOverlays") { (view: ExpoArcgisMapView, refs: [GraphicsOverlayRef]) in
        view.setGraphicsOverlays(refs)
      }

      Prop("viewpoint") { (view: ExpoArcgisMapView, viewpoint: [String: Any]?) in
        view.setViewpoint(viewpoint)
      }
    }

    // 3D scene host — named so JS resolves it via requireNativeView('ExpoArcgis', 'ExpoArcgisSceneView').
    // Swift names views with `ViewName(...)` (Kotlin uses `Name(...)` inside the View block).
    View(ExpoArcgisSceneView.self) {
      ViewName("ExpoArcgisSceneView")
      Events("onSceneLoaded", "onSceneLoadError", "onTap")

      Prop("scene") { (view: ExpoArcgisSceneView, ref: SceneRef?) in
        view.setScene(ref)
      }

      Prop("graphicsOverlays") { (view: ExpoArcgisSceneView, refs: [GraphicsOverlayRef]) in
        view.setGraphicsOverlays(refs)
      }
    }
  }
}

private func readApiKeyFromInfoPlist() -> String? {
  guard let key = Bundle.main.object(forInfoDictionaryKey: "ArcGISAPIKey") as? String,
        !key.isEmpty else {
    return nil
  }
  return key
}
