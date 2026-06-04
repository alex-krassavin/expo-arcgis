package expo.modules.arcgis

import android.content.Context
import com.arcgismaps.ApiKey
import com.arcgismaps.ArcGISEnvironment
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
        MapRef(appContext).also { ref -> props?.let { ref.applyProps(it) } }
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

    // Operational layers — SharedObjects the JS <FeatureLayer>/<TileLayer> construct.
    Class(FeatureLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        FeatureLayerRef(appContext, props["url"] as String).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: FeatureLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
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

    // Graphics overlay (owned by a MapView) and the graphics drawn on it.
    Class(GraphicsOverlayRef::class) {
      Constructor { GraphicsOverlayRef(appContext) }
      Function("addGraphic") { ref: GraphicsOverlayRef, graphic: GraphicRef ->
        ref.addGraphic(graphic)
      }
      Function("removeGraphic") { ref: GraphicsOverlayRef, graphic: GraphicRef ->
        ref.removeGraphic(graphic)
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

    // 2D map host — receives the map + graphics overlay SharedObjects as props.
    View(ExpoArcgisMapView::class) {
      Events("onMapLoaded", "onMapLoadError", "onTap")

      Prop("map") { view: ExpoArcgisMapView, ref: MapRef? ->
        view.setMap(ref)
      }

      Prop("graphicsOverlay") { view: ExpoArcgisMapView, ref: GraphicsOverlayRef? ->
        view.setGraphicsOverlay(ref)
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
