package expo.modules.arcgis

import android.content.Context
import com.arcgismaps.ApiKey
import com.arcgismaps.ArcGISEnvironment
import com.arcgismaps.httpcore.authentication.OAuthApplicationCredential
import com.arcgismaps.httpcore.authentication.OAuthUserCredential
import com.arcgismaps.httpcore.authentication.TokenCredential
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoArcgisModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArcgis")

    OnCreate {
      val context = appContext.reactContext?.applicationContext
      if (context != null) {
        // Required by the SDK before any Map/MapView is created.
        ArcGISEnvironment.applicationContext = context
        // Pick up an API key injected at build time by the config plugin (strings.xml).
        readApiKeyResource(context)?.let { key ->
          ArcGISEnvironment.apiKey = ApiKey.create(key)
        }
      }
      // Reactive auth: the SDK asks this handler for credentials when a secured resource is hit.
      ArcGISEnvironment.authenticationManager.arcGISAuthenticationChallengeHandler = AuthChallengeHandler
    }

    Function("setApiKey") { apiKey: String ->
      ArcGISEnvironment.apiKey = ApiKey.create(apiKey)
    }

    // Token auth for secured services (e.g. utility-network feature services) — store the login;
    // the challenge handler mints a TokenCredential for the exact challenged resource on demand.
    // `tokenExpirationMinutes` is optional; the server's default expiry is used when omitted.
    Function("setTokenCredential") { username: String, password: String, tokenExpirationMinutes: Int? ->
      AuthChallengeHandler.setCredentials(username, password, tokenExpirationMinutes)
    }

    // Revokes any OAuth user credentials on the server, then clears all cached credentials.
    AsyncFunction("signOut") Coroutine { ->
      val store = ArcGISEnvironment.authenticationManager.arcGISCredentialStore
      for (credential in store.getCredentials()) {
        if (credential is OAuthUserCredential) {
          credential.revokeToken()
        }
      }
      AuthChallengeHandler.setCredentials(null, null)
      store.removeAll()
    }

    // OAuth user sign-in (Android): JS opens the browser between these two steps.
    AsyncFunction("oauthStart") Coroutine { portalUrl: String, clientId: String, redirectUrl: String ->
      OAuthController.start(portalUrl, clientId, redirectUrl)
    }
    AsyncFunction("oauthComplete") Coroutine { redirectUrl: String ->
      OAuthController.complete(redirectUrl)
    }

    // App authentication (client id + secret, no user login) — caches an app token credential.
    AsyncFunction("setAppCredential") Coroutine { portalUrl: String, clientId: String, clientSecret: String ->
      val credential = OAuthApplicationCredential.create(portalUrl, clientId, clientSecret).getOrThrow()
      ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(credential)
    }

    // Declarative map model — a SharedObject the JS <Map> constructs and reconciles.
    Class(MapRef::class) {
      Constructor { props: Map<String, Any?>? ->
        MapRef(appContext, props?.get("portalItem") as? Map<String, Any?>)
          .also { ref -> props?.let { ref.applyProps(it) } }
      }

      Function("applyProps") { ref: MapRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }

      Function("addLayer") { ref: MapRef, layer: LayerRef ->
        ref.addLayer(layer)
      }

      Function("removeLayer") { ref: MapRef, layer: LayerRef ->
        ref.removeLayer(layer)
      }
    }

    // Declarative 3D scene model — a SharedObject the JS <Scene> constructs and reconciles.
    Class(SceneRef::class) {
      Constructor { props: Map<String, Any?>? ->
        SceneRef(appContext, props?.get("portalItem") as? Map<String, Any?>)
          .also { ref -> props?.let { ref.applyProps(it) } }
      }
      Function("applyProps") { ref: SceneRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
      Function("addLayer") { ref: SceneRef, layer: LayerRef ->
        ref.addLayer(layer)
      }
      Function("removeLayer") { ref: SceneRef, layer: LayerRef ->
        ref.removeLayer(layer)
      }
    }

    // Operational layers — SharedObjects the JS <FeatureLayer>/<TileLayer> construct.
    // FeatureLayerRef is registered on the ExpoArcgisGeometry module to keep this module's
    // definition() under the Android JVM 64 KB method-size limit (SharedObjects cross modules).

    Class(TiledLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        TiledLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: TiledLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(MapImageLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        MapImageLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: MapImageLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(SceneLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        SceneLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: SceneLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(VectorTiledLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        VectorTiledLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: VectorTiledLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(IntegratedMeshLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        IntegratedMeshLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: IntegratedMeshLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(PointCloudLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        PointCloudLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: PointCloudLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(Ogc3DTilesLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        Ogc3DTilesLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: Ogc3DTilesLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(WebTiledLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        WebTiledLayerRef(appContext, props["urlTemplate"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: WebTiledLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(OpenStreetMapLayerRef::class) {
      Constructor { OpenStreetMapLayerRef(appContext) }
      Function("applyProps") { ref: OpenStreetMapLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(WmsLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        val layerNames = (props["layerNames"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
        WmsLayerRef(appContext, props["url"] as String, layerNames).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: WmsLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(WmtsLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        WmtsLayerRef(appContext, props["url"] as String, props["layerId"] as String)
          .also { it.applyProps(props) }
      }
      Function("applyProps") { ref: WmtsLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(RasterLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        @Suppress("UNCHECKED_CAST")
        val source = props["source"] as? Map<String, Any?> ?: emptyMap()
        RasterLayerRef(appContext, source).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: RasterLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    Class(KmlLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        KmlLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: KmlLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    // WFS (Web Feature Service) + OGC API - Features — feature layers over async-populating tables.
    Class(WfsLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        WfsLayerRef(appContext, props["url"] as? String ?: "", props["tableName"] as? String ?: "")
          .also { it.applyProps(props) }
      }
      Function("applyProps") { ref: WfsLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    Class(OgcFeatureLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        OgcFeatureLayerRef(appContext, props["url"] as? String ?: "", props["collectionId"] as? String ?: "")
          .also { it.applyProps(props) }
      }
      Function("applyProps") { ref: OgcFeatureLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }

    // Real-time DynamicEntityLayer (stream service) — emits onConnectionStatusChange +
    // onDynamicEntityChange (received/purged entity events).
    Class(DynamicEntityLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        DynamicEntityLayerRef(appContext, props).also { it.applyProps(props) }
      }
      Events("onConnectionStatusChange", "onDynamicEntityChange")
      Function("applyProps") { ref: DynamicEntityLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
      AsyncFunction("queryDynamicEntities") Coroutine { ref: DynamicEntityLayerRef ->
        ref.queryDynamicEntities()
      }
      AsyncFunction("queryObservations") Coroutine { ref: DynamicEntityLayerRef, entityId: String, max: Int ->
        ref.queryObservations(entityId, max)
      }
      Function("pushObservation") { ref: DynamicEntityLayerRef, attributes: Map<String, Any?>, geometry: Map<String, Any?> ->
        ref.pushObservation(attributes, geometry)
      }
    }

    // Graphics overlay (owned by a MapView) and the graphics drawn on it.
    Class(GraphicsOverlayRef::class) {
      Constructor { GraphicsOverlayRef(appContext) }
      Function("addGraphic") { ref: GraphicsOverlayRef, graphic: GraphicRef ->
        ref.addGraphic(graphic)
      }
      Function("removeGraphic") { ref: GraphicsOverlayRef, graphic: GraphicRef ->
        ref.removeGraphic(graphic)
      }
      Function("setRenderer") { ref: GraphicsOverlayRef, renderer: Map<String, Any?>? ->
        ref.setRenderer(renderer)
      }
    }

    Class(GraphicRef::class) {
      Constructor { props: Map<String, Any?> ->
        GraphicRef(appContext).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: GraphicRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    // Analysis overlay (owned by a SceneView) and the exploratory visual analyses drawn on it.
    Class(AnalysisOverlayRef::class) {
      Constructor { AnalysisOverlayRef(appContext) }
      Function("addAnalysis") { ref: AnalysisOverlayRef, analysis: AnalysisRef ->
        ref.addAnalysis(analysis)
      }
      Function("removeAnalysis") { ref: AnalysisOverlayRef, analysis: AnalysisRef ->
        ref.removeAnalysis(analysis)
      }
      Function("setVisible") { ref: AnalysisOverlayRef, visible: Boolean -> ref.setVisible(visible) }
    }

    Class(ViewshedRef::class) {
      Constructor { props: Map<String, Any?> -> ViewshedRef(appContext, props) }
      Function("applyProps") { ref: ViewshedRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }

    // GeoElement-anchored viewshed — observer tracks a Graphic as it moves.
    Class(GeoElementViewshedRef::class) {
      Constructor { graphic: GraphicRef, props: Map<String, Any?> ->
        GeoElementViewshedRef(appContext, graphic, props)
      }
      Function("applyProps") { ref: GeoElementViewshedRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    // Line of sight — emits onTargetVisibilityChange as the target's visibility changes.
    Class(LineOfSightRef::class) {
      Constructor { props: Map<String, Any?> -> LineOfSightRef(appContext, props) }
      Events("onTargetVisibilityChange")
      Function("applyProps") { ref: LineOfSightRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }

    // GeoElement-anchored line of sight — observer and target each track a Graphic as it moves.
    // FLAG: added to the main module — integrator may need to relocate for the 64 KB budget.
    Class(GeoElementLineOfSightRef::class) {
      Constructor { observer: GraphicRef, target: GraphicRef ->
        GeoElementLineOfSightRef(appContext, observer, target)
      }
      Events("onTargetVisibilityChange")
    }

    Class(DistanceMeasurementRef::class) {
      Constructor { props: Map<String, Any?> -> DistanceMeasurementRef(appContext, props) }
      Events("onMeasurementChange")
      Function("applyProps") { ref: DistanceMeasurementRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }

    // Utility network — loaded from a feature service, attached to a <Map>; runs traces.
    Class(UtilityNetworkRef::class) {
      Constructor { props: Map<String, Any?> ->
        UtilityNetworkRef(appContext, props["serviceGeodatabaseUrl"] as? String ?: "")
      }
      AsyncFunction("load") Coroutine { ref: UtilityNetworkRef, map: MapRef ->
        ref.load(map)
      }
      Function("describeNetwork") { ref: UtilityNetworkRef -> ref.describeNetwork() }
      AsyncFunction("trace") Coroutine { ref: UtilityNetworkRef, traceType: String, startingLocations: List<Map<String, Any?>> ->
        ref.trace(traceType, startingLocations)
      }
      AsyncFunction("traceFromQuery") Coroutine { ref: UtilityNetworkRef, tableName: String, whereClause: String, traceType: String ->
        ref.traceFromQuery(tableName, whereClause, traceType)
      }
      AsyncFunction("queryNamedTraceConfigurations") Coroutine { ref: UtilityNetworkRef ->
        ref.queryNamedTraceConfigurations()
      }
      AsyncFunction("traceWithConfiguration") Coroutine { ref: UtilityNetworkRef, configGlobalId: String, tableName: String, whereClause: String ->
        ref.traceWithConfiguration(configGlobalId, tableName, whereClause)
      }
      AsyncFunction("associations") Coroutine { ref: UtilityNetworkRef, tableName: String, whereClause: String ->
        ref.associations(tableName, whereClause)
      }
      AsyncFunction("getState") Coroutine { ref: UtilityNetworkRef -> ref.getState() }
      Function("validateNetworkTopology") { ref: UtilityNetworkRef, extent: Map<String, Any?> ->
        ref.validateNetworkTopology(extent)
      }
    }

    // Interactive GeometryEditor — bound to a <MapView> for sketching; emits onGeometryChange.
    Class(GeometryEditorRef::class) {
      Constructor { GeometryEditorRef(appContext) }
      Events("onGeometryChange")
      Function("start") { ref: GeometryEditorRef, type: String -> ref.start(type) }
      Function("setTool") { ref: GeometryEditorRef, name: String -> ref.setTool(name) }
      Function("stop") { ref: GeometryEditorRef -> ref.stop() }
      Function("clearGeometry") { ref: GeometryEditorRef -> ref.clearGeometry() }
      Function("undo") { ref: GeometryEditorRef -> ref.undo() }
      Function("redo") { ref: GeometryEditorRef -> ref.redo() }
      Function("deleteSelectedElement") { ref: GeometryEditorRef -> ref.deleteSelectedElement() }
    }

    // 2D map host — receives the map + graphics overlay SharedObjects as props.
    View(ExpoArcgisMapView::class) {
      Events("onMapLoaded", "onMapLoadError", "onTap", "onLocationChange")

      Prop("map") { view: ExpoArcgisMapView, ref: MapRef? ->
        view.setMap(ref)
      }

      Prop("graphicsOverlays") { view: ExpoArcgisMapView, refs: List<GraphicsOverlayRef> ->
        view.setGraphicsOverlays(refs)
      }

      Prop("viewpoint") { view: ExpoArcgisMapView, vp: Map<String, Any?>? ->
        view.setViewpoint(vp)
      }

      Prop("locationDisplay") { view: ExpoArcgisMapView, config: Map<String, Any?>? ->
        view.setLocationDisplay(config)
      }

      Prop("geometryEditor") { view: ExpoArcgisMapView, ref: GeometryEditorRef? ->
        view.setGeometryEditor(ref)
      }

      AsyncFunction("identify") { view: ExpoArcgisMapView, screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise ->
        view.identify(screenPoint, options, promise)
      }

      AsyncFunction("identifyPopups") { view: ExpoArcgisMapView, screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise ->
        view.identifyPopups(screenPoint, options, promise)
      }

      AsyncFunction("retryLoad") { view: ExpoArcgisMapView, promise: Promise ->
        view.retryLoad(promise)
      }
    }

    // 3D scene host — named so JS resolves it via requireNativeView('ExpoArcgis', 'ExpoArcgisSceneView').
    View(ExpoArcgisSceneView::class) {
      Name("ExpoArcgisSceneView")
      Events("onSceneLoaded", "onSceneLoadError", "onTap")

      Prop("scene") { view: ExpoArcgisSceneView, ref: SceneRef? ->
        view.setScene(ref)
      }

      Prop("graphicsOverlays") { view: ExpoArcgisSceneView, refs: List<GraphicsOverlayRef> ->
        view.setGraphicsOverlays(refs)
      }

      Prop("analysisOverlays") { view: ExpoArcgisSceneView, refs: List<AnalysisOverlayRef> ->
        view.setAnalysisOverlays(refs)
      }

      Prop("camera") { view: ExpoArcgisSceneView, camera: Map<String, Any?>? ->
        view.setCamera(camera)
      }

      Prop("cameraController") { view: ExpoArcgisSceneView, value: Map<String, Any?>? ->
        view.setCameraController(value)
      }

      Prop("sunLighting") { view: ExpoArcgisSceneView, value: String? ->
        view.setSunLighting(value)
      }

      Prop("atmosphereEffect") { view: ExpoArcgisSceneView, value: String? ->
        view.setAtmosphereEffect(value)
      }

      Prop("sunTime") { view: ExpoArcgisSceneView, value: Double? ->
        view.setSunTime(value)
      }

      AsyncFunction("retryLoad") { view: ExpoArcgisSceneView, promise: Promise ->
        view.retryLoad(promise)
      }

      AsyncFunction("identify") { view: ExpoArcgisSceneView, screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise ->
        view.identify(screenPoint, options, promise)
      }

      AsyncFunction("identifyPopups") { view: ExpoArcgisSceneView, screenPoint: Map<String, Any?>, options: Map<String, Any?>?, promise: Promise ->
        view.identifyPopups(screenPoint, options, promise)
      }
    }
  }
}

/** Reads the optional `arcgis_api_key` string resource added by the config plugin. */
private fun readApiKeyResource(context: Context): String? {
  val id = context.resources.getIdentifier("arcgis_api_key", "string", context.packageName)
  if (id == 0) return null
  return context.getString(id).ifBlank { null }
}
