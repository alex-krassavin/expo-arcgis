package expo.modules.arcgis

import android.content.Context
import com.arcgismaps.ApiKey
import com.arcgismaps.ArcGISEnvironment
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
    }

    Function("setApiKey") { apiKey: String ->
      ArcGISEnvironment.apiKey = ApiKey.create(apiKey)
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
    Class(FeatureLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        FeatureLayerRef(appContext, props).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: FeatureLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
      AsyncFunction("queryFeatures") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryFeatures(query)
      }
      AsyncFunction("queryFeatureCount") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryFeatureCount(query)
      }
      AsyncFunction("queryExtent") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryExtent(query)
      }
    }

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

    // Interactive GeometryEditor — bound to a <MapView> for sketching; emits onGeometryChange.
    Class(GeometryEditorRef::class) {
      Constructor { GeometryEditorRef(appContext) }
      Events("onGeometryChange")
      Function("start") { ref: GeometryEditorRef, type: String -> ref.start(type) }
      Function("stop") { ref: GeometryEditorRef -> ref.stop() }
      Function("clearGeometry") { ref: GeometryEditorRef -> ref.clearGeometry() }
      Function("undo") { ref: GeometryEditorRef -> ref.undo() }
      Function("redo") { ref: GeometryEditorRef -> ref.redo() }
      Function("deleteSelectedElement") { ref: GeometryEditorRef -> ref.deleteSelectedElement() }
    }

    // 2D map host — receives the map + graphics overlay SharedObjects as props.
    View(ExpoArcgisMapView::class) {
      Events("onMapLoaded", "onMapLoadError", "onTap")

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

      Prop("camera") { view: ExpoArcgisSceneView, camera: Map<String, Any?>? ->
        view.setCamera(camera)
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
    }
  }
}

/** Reads the optional `arcgis_api_key` string resource added by the config plugin. */
private fun readApiKeyResource(context: Context): String? {
  val id = context.resources.getIdentifier("arcgis_api_key", "string", context.packageName)
  if (id == 0) return null
  return context.getString(id).ifBlank { null }
}
