package expo.modules.arcgis

import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.ArcGISScene
import com.arcgismaps.mapping.ArcGISTiledElevationSource
import com.arcgismaps.mapping.Bookmark
import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.BasemapStyle
import com.arcgismaps.mapping.MobileScenePackage
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.mapping.Surface
import com.arcgismaps.mapping.Viewpoint
import com.arcgismaps.mapping.view.Camera
import com.arcgismaps.portal.Portal
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** SharedObject wrapping a native [ArcGISScene] (3D). Mirrors [MapRef]. */
class SceneRef(appContext: AppContext, portalItem: Map<String, Any?>? = null) : SharedObject(appContext) {
  var scene: ArcGISScene = buildScene(portalItem)
    private set

  /** Called when [scene] is replaced asynchronously (e.g. after a mobile scene package loads). */
  var onSceneChanged: ((ArcGISScene) -> Unit)? = null
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  /** Tracks the last applied basemap style/language/worldview to rebuild when any of them changes. */
  private var currentBasemapStyle: String? = null
  private var currentBasemapLanguage: String? = null
  private var currentBasemapWorldview: String? = null

  fun applyProps(changed: Map<String, Any?>) {
    // Collect basemap-related changes first, then rebuild once if any changed.
    var basemapDirty = false
    if (changed.containsKey("basemap")) {
      currentBasemapStyle = changed["basemap"] as? String
      basemapDirty = true
    }
    if (changed.containsKey("basemapLanguage")) {
      currentBasemapLanguage = changed["basemapLanguage"] as? String
      basemapDirty = true
    }
    if (changed.containsKey("basemapWorldview")) {
      currentBasemapWorldview = changed["basemapWorldview"] as? String
      basemapDirty = true
    }
    if (basemapDirty) {
      currentBasemapStyle?.let { styleName ->
        basemapStyleFromString(styleName)?.let { style ->
          scene.setBasemap(buildBasemap(style, currentBasemapLanguage, currentBasemapWorldview))
        }
      }
    }

    changed.forEach { (key, value) ->
      when (key) {
        "basemap", "basemapLanguage", "basemapWorldview" -> Unit // already handled above
        "initialViewpoint" -> (value as? Map<*, *>)?.let { vp ->
          val lat = (vp["latitude"] as? Number)?.toDouble()
          val lon = (vp["longitude"] as? Number)?.toDouble()
          val scale = (vp["scale"] as? Number)?.toDouble()
          if (lat != null && lon != null && scale != null) {
            scene.initialViewpoint = Viewpoint(lat, lon, scale)
          }
        }
        "surface" -> (value as? Map<*, *>)?.let { scene.baseSurface = buildSurface(it) }
        "camera" -> (value as? Map<*, *>)?.let { c ->
          (c["position"] as? Map<*, *>)?.let { position ->
            val point = scenePoint(position)
            val camera = Camera(
              point,
              (c["heading"] as? Number)?.toDouble() ?: 0.0,
              (c["pitch"] as? Number)?.toDouble() ?: 0.0,
              (c["roll"] as? Number)?.toDouble() ?: 0.0,
            )
            scene.initialViewpoint = Viewpoint(point, camera)
          }
        }
        "bookmarks" -> (value as? List<*>)?.let { entries ->
          scene.bookmarks.clear()
          for (entry in entries) {
            val e = entry as? Map<*, *> ?: continue
            val name = e["name"] as? String ?: continue
            val vp = e["viewpoint"] as? Map<*, *> ?: continue
            val lat = (vp["latitude"] as? Number)?.toDouble() ?: continue
            val lon = (vp["longitude"] as? Number)?.toDouble() ?: continue
            val scale = (vp["scale"] as? Number)?.toDouble() ?: continue
            scene.bookmarks.add(Bookmark(name, Viewpoint(lat, lon, scale)))
          }
        }
        "mobileScenePackagePath" -> (value as? String)?.let { loadMobileScenePackage(it) }
      }
    }
  }

  /** Loads a mobile scene package (`.mspk`) off the main thread and swaps in its first scene. */
  private fun loadMobileScenePackage(path: String) {
    scope.launch {
      val pkg = MobileScenePackage(path)
      pkg.load().onSuccess {
        pkg.scenes.firstOrNull()?.let { first ->
          scene = first
          onSceneChanged?.invoke(first)
        }
      }
    }
  }

  fun addLayer(ref: LayerRef) {
    scene.operationalLayers.add(ref.layer)
  }

  fun removeLayer(ref: LayerRef) {
    scene.operationalLayers.remove(ref.layer)
  }
}

/** Builds a [Point] (with optional `z` altitude) from a JS dict, defaulting to WGS84. */
private fun scenePoint(p: Map<*, *>): Point {
  val x = (p["x"] as? Number)?.toDouble() ?: 0.0
  val y = (p["y"] as? Number)?.toDouble() ?: 0.0
  val z = (p["z"] as? Number)?.toDouble()
  return if (z != null) Point(x, y, z, SpatialReference.wgs84())
  else Point(x, y, SpatialReference.wgs84())
}

/** Builds a [Surface] (terrain) from a JS dict of tiled elevation sources + exaggeration. */
private fun buildSurface(s: Map<*, *>): Surface = Surface().apply {
  (s["elevationSources"] as? List<*>)?.forEach { src ->
    ((src as? Map<*, *>)?.get("url") as? String)?.let {
      elevationSources.add(ArcGISTiledElevationSource(it))
    }
  }
  (s["elevationExaggeration"] as? Number)?.toFloat()?.let { elevationExaggeration = it }
}

/** Builds the scene from a portal item (web scene) when provided, otherwise an empty scene. */
private fun buildScene(portalItem: Map<String, Any?>?): ArcGISScene {
  portalItem ?: return ArcGISScene()
  val itemId = portalItem["itemId"] as? String ?: return ArcGISScene()
  val portalUrl = portalItem["portalUrl"] as? String ?: "https://www.arcgis.com"
  return ArcGISScene(PortalItem(Portal(portalUrl, Portal.Connection.Anonymous), itemId))
}
