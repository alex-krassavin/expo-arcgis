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

    // GeometryEngine — spatial operations exposed as the JS `geometryEngine` namespace.
    Function("geProject", geProject)
    Function("geBuffer", geBuffer)
    Function("geGeodeticBuffer", geGeodeticBuffer)
    Function("geArea", geArea)
    Function("geGeodeticArea", geGeodeticArea)
    Function("geLength", geLength)
    Function("geGeodeticLength", geGeodeticLength)
    Function("geDistance", geDistance)
    Function("geGeodeticDistance", geGeodeticDistance)
    Function("geUnion", geUnion)
    Function("geIntersection", geIntersection)
    Function("geDifference", geDifference)
    Function("geSymmetricDifference", geSymmetricDifference)
    Function("geClip", geClip)
    Function("geCut", geCut)
    Function("geConvexHull", geConvexHull)
    Function("geBoundary", geBoundary)
    Function("geSimplify", geSimplify)
    Function("geDensify", geDensify)
    Function("geGeneralize", geGeneralize)
    Function("geOffset", geOffset)
    Function("geCombineExtents", geCombineExtents)
    Function("geContains", geContains)
    Function("geCrosses", geCrosses)
    Function("geDisjoint", geDisjoint)
    Function("geEquals", geEquals)
    Function("geIntersects", geIntersects)
    Function("geOverlaps", geOverlaps)
    Function("geTouches", geTouches)
    Function("geWithin", geWithin)
    Function("geRelate", geRelate)
    Function("geIsSimple", geIsSimple)
    Function("geNearestCoordinate", geNearestCoordinate)
    Function("geNearestVertex", geNearestVertex)
    Function("geMove", geMove)
    Function("geRotate", geRotate)
    Function("geScale", geScale)

    // CoordinateFormatter — point <-> notation strings, exposed as the JS `coordinateFormatter` namespace.
    Function("cfToLatLong", cfToLatLong)
    Function("cfFromLatLong", cfFromLatLong)
    Function("cfToMgrs", cfToMgrs)
    Function("cfFromMgrs", cfFromMgrs)
    Function("cfToUsng", cfToUsng)
    Function("cfFromUsng", cfFromUsng)
    Function("cfToUtm", cfToUtm)
    Function("cfFromUtm", cfFromUtm)

    // Declarative map model — a SharedObject the JS <Map> constructs and reconciles.
    Class(MapRef.self) {
      Constructor { (props: [String: Any]?) -> MapRef in
        let ref = MapRef(portalItem: props?["portalItem"] as? [String: Any])
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
        let ref = SceneRef(portalItem: props?["portalItem"] as? [String: Any])
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
        let ref = FeatureLayerRef(props: props)
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

    Class(MapImageLayerRef.self) {
      Constructor { (props: [String: Any]) -> MapImageLayerRef in
        let ref = MapImageLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: MapImageLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(SceneLayerRef.self) {
      Constructor { (props: [String: Any]) -> SceneLayerRef in
        let ref = SceneLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: SceneLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(VectorTiledLayerRef.self) {
      Constructor { (props: [String: Any]) -> VectorTiledLayerRef in
        let ref = VectorTiledLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: VectorTiledLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(IntegratedMeshLayerRef.self) {
      Constructor { (props: [String: Any]) -> IntegratedMeshLayerRef in
        let ref = IntegratedMeshLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: IntegratedMeshLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(PointCloudLayerRef.self) {
      Constructor { (props: [String: Any]) -> PointCloudLayerRef in
        let ref = PointCloudLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: PointCloudLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(Ogc3DTilesLayerRef.self) {
      Constructor { (props: [String: Any]) -> Ogc3DTilesLayerRef in
        let ref = Ogc3DTilesLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: Ogc3DTilesLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(WebTiledLayerRef.self) {
      Constructor { (props: [String: Any]) -> WebTiledLayerRef in
        let ref = WebTiledLayerRef(urlTemplate: props["urlTemplate"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: WebTiledLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(OpenStreetMapLayerRef.self) {
      Constructor { () -> OpenStreetMapLayerRef in OpenStreetMapLayerRef() }
      Function("applyProps") { (ref: OpenStreetMapLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(WmsLayerRef.self) {
      Constructor { (props: [String: Any]) -> WmsLayerRef in
        let ref = WmsLayerRef(
          url: props["url"] as? String ?? "",
          layerNames: props["layerNames"] as? [String] ?? []
        )
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: WmsLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(WmtsLayerRef.self) {
      Constructor { (props: [String: Any]) -> WmtsLayerRef in
        let ref = WmtsLayerRef(
          url: props["url"] as? String ?? "",
          layerID: props["layerId"] as? String ?? ""
        )
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: WmtsLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(RasterLayerRef.self) {
      Constructor { (props: [String: Any]) -> RasterLayerRef in
        let ref = RasterLayerRef(source: props["source"] as? [String: Any] ?? [:])
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: RasterLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    Class(KmlLayerRef.self) {
      Constructor { (props: [String: Any]) -> KmlLayerRef in
        let ref = KmlLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: KmlLayerRef, changed: [String: Any]) in
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
      Function("setRenderer") { (ref: GraphicsOverlayRef, renderer: [String: Any]?) in
        ref.setRenderer(renderer)
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

      Prop("locationDisplay") { (view: ExpoArcgisMapView, config: [String: Any]?) in
        view.setLocationDisplay(config)
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

      Prop("camera") { (view: ExpoArcgisSceneView, camera: [String: Any]?) in
        view.setCamera(camera)
      }

      Prop("sunLighting") { (view: ExpoArcgisSceneView, value: String?) in
        view.setSunLighting(value)
      }

      Prop("atmosphereEffect") { (view: ExpoArcgisSceneView, value: String?) in
        view.setAtmosphereEffect(value)
      }

      Prop("sunTime") { (view: ExpoArcgisSceneView, value: Double?) in
        view.setSunTime(value)
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
