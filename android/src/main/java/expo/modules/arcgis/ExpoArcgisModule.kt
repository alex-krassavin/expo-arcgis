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
    Class(ArcGISMapRef::class) {
      Constructor { props: Map<String, Any?>? ->
        ArcGISMapRef(appContext).also { ref -> props?.let { ref.applyProps(it) } }
      }

      Function("applyProps") { ref: ArcGISMapRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
    }

    // 2D map host — receives the map SharedObject as the `map` prop.
    View(ExpoArcgisMapView::class) {
      Events("onMapLoaded", "onMapLoadError")

      Prop("map") { view: ExpoArcgisMapView, ref: ArcGISMapRef? ->
        view.setMap(ref)
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
