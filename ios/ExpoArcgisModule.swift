import ArcGIS
import ExpoModulesCore
import Foundation

public class ExpoArcgisModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgis")

    OnCreate {
      // Pick up an API key injected at build time by the config plugin (Info.plist).
      if let key = readApiKeyFromInfoPlist() {
        ArcGISEnvironment.apiKey = APIKey(key)
      }
      // Reactive auth: the SDK asks this handler for credentials when a secured resource is hit.
      ArcGISEnvironment.authenticationManager.arcGISAuthenticationChallengeHandler = AuthChallengeHandler.shared
    }

    Function("setApiKey") { (apiKey: String) in
      ArcGISEnvironment.apiKey = APIKey(apiKey)
    }

    // Token auth for secured services (e.g. utility-network feature services) — store the login;
    // the challenge handler mints a TokenCredential for the exact challenged resource on demand.
    Function("setTokenCredential") { (username: String, password: String) in
      AuthChallengeHandler.shared.setCredentials(username: username, password: password)
    }

    // Clears the stored login and all cached credentials (token + OAuth).
    AsyncFunction("signOut") {
      AuthChallengeHandler.shared.setCredentials(username: nil, password: nil)
      ArcGISEnvironment.authenticationManager.arcGISCredentialStore.removeAll()
    }

    // OAuth user sign-in. On iOS the SDK presents the auth browser (ASWebAuthenticationSession)
    // itself; we just await the credential and cache it. (Android drives the browser from JS.)
    AsyncFunction("signInWithOAuth") { (portalUrl: String, clientId: String, redirectUrl: String) in
      guard let portal = URL(string: portalUrl), let redirect = URL(string: redirectUrl) else { return }
      let configuration = OAuthUserConfiguration(portalURL: portal, clientID: clientId, redirectURL: redirect)
      let credential = try await OAuthUserCredential.credential(for: configuration)
      ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(credential)
    }

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
      AsyncFunction("queryFeatures") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryFeatures(query)
      }
      AsyncFunction("queryFeatureCount") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryFeatureCount(query)
      }
      AsyncFunction("queryExtent") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryExtent(query)
      }
      AsyncFunction("queryStatistics") { (ref: FeatureLayerRef, query: [String: Any]) in
        try await ref.queryStatistics(query)
      }
      AsyncFunction("addFeature") { (ref: FeatureLayerRef, attributes: [String: Any], geometry: [String: Any]?) in
        try await ref.addFeature(attributes, geometry)
      }
      AsyncFunction("updateFeature") { (ref: FeatureLayerRef, objectId: Int, changes: [String: Any]) in
        try await ref.updateFeature(objectId, changes)
      }
      AsyncFunction("deleteFeature") { (ref: FeatureLayerRef, objectId: Int) in
        try await ref.deleteFeature(objectId)
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

    // WFS (Web Feature Service) + OGC API - Features — feature layers over async-populating tables.
    Class(WfsLayerRef.self) {
      Constructor { (props: [String: Any]) -> WfsLayerRef in
        let ref = WfsLayerRef(url: props["url"] as? String ?? "", tableName: props["tableName"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: WfsLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    Class(OgcFeatureLayerRef.self) {
      Constructor { (props: [String: Any]) -> OgcFeatureLayerRef in
        let ref = OgcFeatureLayerRef(url: props["url"] as? String ?? "", collectionID: props["collectionId"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: OgcFeatureLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }

    // Real-time DynamicEntityLayer (stream service) — emits onConnectionStatusChange.
    Class(DynamicEntityLayerRef.self) {
      Constructor { (props: [String: Any]) -> DynamicEntityLayerRef in
        let ref = DynamicEntityLayerRef(props: props)
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: DynamicEntityLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
      AsyncFunction("queryDynamicEntities") { (ref: DynamicEntityLayerRef) in
        try await ref.queryDynamicEntities()
      }
      Function("pushObservation") { (ref: DynamicEntityLayerRef, attributes: [String: Any], geometry: [String: Any]) in
        ref.pushObservation(attributes, geometry)
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

    // Analysis overlay (owned by a SceneView) and the exploratory visual analyses drawn on it.
    Class(AnalysisOverlayRef.self) {
      Constructor { () -> AnalysisOverlayRef in AnalysisOverlayRef() }
      Function("addAnalysis") { (ref: AnalysisOverlayRef, analysis: AnalysisRef) in
        ref.addAnalysis(analysis)
      }
      Function("removeAnalysis") { (ref: AnalysisOverlayRef, analysis: AnalysisRef) in
        ref.removeAnalysis(analysis)
      }
      Function("setVisible") { (ref: AnalysisOverlayRef, visible: Bool) in ref.setVisible(visible) }
    }

    Class(ViewshedRef.self) {
      Constructor { (props: [String: Any]) -> ViewshedRef in ViewshedRef(props: props) }
      Function("applyProps") { (ref: ViewshedRef, changed: [String: Any]) in ref.applyProps(changed) }
    }

    // Line of sight — emits onTargetVisibilityChange (SharedObject.emit + JS addListener).
    Class(LineOfSightRef.self) {
      Constructor { (props: [String: Any]) -> LineOfSightRef in LineOfSightRef(props: props) }
      Function("applyProps") { (ref: LineOfSightRef, changed: [String: Any]) in ref.applyProps(changed) }
    }

    Class(DistanceMeasurementRef.self) {
      Constructor { (props: [String: Any]) -> DistanceMeasurementRef in DistanceMeasurementRef(props: props) }
      Function("applyProps") { (ref: DistanceMeasurementRef, changed: [String: Any]) in ref.applyProps(changed) }
    }

    // Utility network — loaded from a feature service, attached to a <Map>; runs traces.
    Class(UtilityNetworkRef.self) {
      Constructor { (props: [String: Any]) -> UtilityNetworkRef in
        UtilityNetworkRef(serviceGeodatabaseUrl: props["serviceGeodatabaseUrl"] as? String ?? "")
      }
      AsyncFunction("load") { (ref: UtilityNetworkRef, map: MapRef) in
        try await ref.load(map)
      }
      AsyncFunction("trace") { (ref: UtilityNetworkRef, traceType: String, startingLocations: [[String: Any]]) in
        try await ref.trace(traceType, startingLocations)
      }
      AsyncFunction("traceFromQuery") { (ref: UtilityNetworkRef, tableName: String, whereClause: String, traceType: String) in
        try await ref.traceFromQuery(tableName, whereClause, traceType)
      }
      AsyncFunction("queryNamedTraceConfigurations") { (ref: UtilityNetworkRef) in
        try await ref.queryNamedTraceConfigurations()
      }
      AsyncFunction("traceWithConfiguration") { (ref: UtilityNetworkRef, configGlobalId: String, tableName: String, whereClause: String) in
        try await ref.traceWithConfiguration(configGlobalId, tableName, whereClause)
      }
      AsyncFunction("associations") { (ref: UtilityNetworkRef, tableName: String, whereClause: String) in
        try await ref.associations(tableName, whereClause)
      }
    }

    // Interactive GeometryEditor — bound to a <MapView> for sketching; emits onGeometryChange
    // (no `Events(...)` element on Swift `Class`; SharedObject.emit + JS addListener suffice).
    Class(GeometryEditorRef.self) {
      Constructor { () -> GeometryEditorRef in GeometryEditorRef() }
      Function("start") { (ref: GeometryEditorRef, type: String) in ref.start(type) }
      Function("setTool") { (ref: GeometryEditorRef, name: String) in ref.setTool(name) }
      Function("stop") { (ref: GeometryEditorRef) in ref.stop() }
      Function("clearGeometry") { (ref: GeometryEditorRef) in ref.clearGeometry() }
      Function("undo") { (ref: GeometryEditorRef) in ref.undo() }
      Function("redo") { (ref: GeometryEditorRef) in ref.redo() }
      Function("deleteSelectedElement") { (ref: GeometryEditorRef) in ref.deleteSelectedElement() }
    }

    // 2D map host — receives the map + graphics overlay SharedObjects as props.
    View(ExpoArcgisMapView.self) {
      Events("onMapLoaded", "onMapLoadError", "onTap", "onLocationChange")

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

      Prop("geometryEditor") { (view: ExpoArcgisMapView, ref: GeometryEditorRef?) in
        view.setGeometryEditor(ref)
      }

      AsyncFunction("identify") { (view: ExpoArcgisMapView, screenPoint: [String: Any], options: [String: Any]?) in
        try await view.identify(screenPoint, options)
      }

      AsyncFunction("retryLoad") { (view: ExpoArcgisMapView) in
        try await view.retryLoad()
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

      Prop("analysisOverlays") { (view: ExpoArcgisSceneView, refs: [AnalysisOverlayRef]) in
        view.setAnalysisOverlays(refs)
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

      AsyncFunction("retryLoad") { (view: ExpoArcgisSceneView) in
        try await view.retryLoad()
      }

      AsyncFunction("identify") { (view: ExpoArcgisSceneView, screenPoint: [String: Any], options: [String: Any]?) in
        try await view.identify(screenPoint, options)
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
