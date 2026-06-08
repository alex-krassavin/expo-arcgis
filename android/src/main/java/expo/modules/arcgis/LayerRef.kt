package expo.modules.arcgis

import com.arcgismaps.data.ArcGISFeatureTable
import com.arcgismaps.data.Feature
import com.arcgismaps.data.FeatureRequestMode
import com.arcgismaps.data.FeatureTable
import com.arcgismaps.data.QueryFeatureFields
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.ServiceFeatureTable
import com.arcgismaps.data.ShapefileFeatureTable
import com.arcgismaps.data.OgcFeatureCollectionTable
import com.arcgismaps.data.WfsFeatureTable
import com.arcgismaps.mapping.layers.ArcGISMapImageLayer
import com.arcgismaps.mapping.layers.ArcGISSceneLayer
import com.arcgismaps.mapping.layers.ArcGISTiledLayer
import com.arcgismaps.mapping.layers.ArcGISVectorTiledLayer
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.layers.IntegratedMeshLayer
import com.arcgismaps.mapping.layers.Layer
import com.arcgismaps.mapping.layers.Ogc3DTilesLayer
import com.arcgismaps.mapping.layers.OpenStreetMapLayer
import com.arcgismaps.mapping.layers.PointCloudLayer
import com.arcgismaps.mapping.layers.RasterLayer
import com.arcgismaps.mapping.layers.WebTiledLayer
import com.arcgismaps.mapping.layers.KmlLayer
import com.arcgismaps.mapping.layers.WmsLayer
import com.arcgismaps.mapping.layers.WmtsLayer
import com.arcgismaps.mapping.kml.KmlDataset
import com.arcgismaps.raster.ImageServiceRaster
import com.arcgismaps.raster.Raster
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/** Base SharedObject for an operational layer; the map reads [layer] by reference. */
abstract class LayerRef(appContext: AppContext) : SharedObject(appContext) {
  abstract val layer: Layer

  abstract fun applyProps(changed: Map<String, Any?>)

  protected fun applyCommonProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "opacity" -> (value as? Number)?.toFloat()?.let { layer.opacity = it }
        "visible" -> (value as? Boolean)?.let { layer.isVisible = it }
      }
    }
  }
}

/** Operational FeatureLayer from a feature service URL or a local shapefile. */
class FeatureLayerRef(appContext: AppContext, props: Map<String, Any?>) : LayerRef(appContext) {
  private val table: FeatureTable = featureTable(props)
  override val layer: FeatureLayer = FeatureLayer.createWithFeatureTable(table)

  /** Returns the features matching `query` (all features when null). Loads attributes in full. */
  suspend fun queryFeatures(query: Map<String, Any?>?): List<Map<String, Any?>> {
    val params = buildQueryParameters(query)
    val result = if (table is ServiceFeatureTable) {
      table.queryFeatures(params, QueryFeatureFields.LoadAll).getOrThrow()
    } else {
      table.queryFeatures(params).getOrThrow()
    }
    return result.map { serializeFeature(it) }
  }

  suspend fun queryFeatureCount(query: Map<String, Any?>?): Long =
    table.queryFeatureCount(buildQueryParameters(query)).getOrThrow()

  suspend fun queryExtent(query: Map<String, Any?>?): Map<String, Any?> =
    dictFromGeometry(table.queryExtent(buildQueryParameters(query)).getOrThrow())

  suspend fun queryStatistics(query: Map<String, Any?>): List<Map<String, Any?>> =
    table.queryStatistics(buildStatisticsQueryParameters(query)).getOrThrow().map { serializeStatisticRecord(it) }

  /** Returns the table's editing templates (name + prototype attributes), for building edit UIs. */
  suspend fun queryFeatureTemplates(): List<Map<String, Any?>> {
    table.load().getOrThrow()
    val templates = (table as? ArcGISFeatureTable)?.featureTemplates ?: emptyList()
    return templates.map { template ->
      mapOf("name" to template.name, "prototypeAttributes" to template.prototypeAttributes)
    }
  }

  /** Adds a feature, pushes the edit to the service, and returns the new object id. */
  suspend fun addFeature(attributes: Map<String, Any?>, geometry: Map<String, Any?>?): Long? {
    val feature = table.createFeature()
    applyAttributes(feature, attributes)
    geometry?.let { dict -> geometryFromDict(dict)?.let { feature.geometry = it } }
    table.addFeature(feature).getOrThrow()
    return persistEdits()
  }

  /** Updates the feature with `objectId` (changed attributes and/or geometry) and pushes the edit. */
  suspend fun updateFeature(objectId: Long, changes: Map<String, Any?>) {
    val feature = featureByObjectId(objectId) ?: return
    (changes["attributes"] as? Map<*, *>)?.let { applyAttributes(feature, it) }
    (changes["geometry"] as? Map<*, *>)?.let { geometryFromDict(it)?.let { g -> feature.geometry = g } }
    table.updateFeature(feature).getOrThrow()
    persistEdits()
  }

  /** Deletes the feature with `objectId` and pushes the edit. */
  suspend fun deleteFeature(objectId: Long) {
    val feature = featureByObjectId(objectId) ?: return
    table.deleteFeature(feature).getOrThrow()
    persistEdits()
  }

  private suspend fun featureByObjectId(objectId: Long): Feature? {
    val params = QueryParameters().apply { objectIds.add(objectId) }
    return table.queryFeatures(params).getOrThrow().firstOrNull()
  }

  /** Pushes pending local edits to the feature service (no-op for non-service tables). */
  private suspend fun persistEdits(): Long? {
    val serviceTable = table as? ServiceFeatureTable ?: return null
    return serviceTable.applyEdits().getOrThrow().firstOrNull()?.objectId
  }

  override fun applyProps(changed: Map<String, Any?>) {
    applyCommonProps(changed)
    if (changed.containsKey("renderer")) {
      val renderer = (changed["renderer"] as? Map<*, *>)?.let { buildRenderer(it) }
      if (renderer != null) layer.renderer = renderer else layer.resetRenderer()
    }
    (changed["labelsEnabled"] as? Boolean)?.let { layer.labelsEnabled = it }
    if (changed.containsKey("labels")) {
      layer.labelDefinitions.clear()
      (changed["labels"] as? List<*>)?.forEach { label ->
        (label as? Map<*, *>)?.let { layer.labelDefinitions.add(buildLabelDefinition(it)) }
      }
    }
    if (changed.containsKey("featureReduction")) {
      layer.featureReduction = (changed["featureReduction"] as? Map<*, *>)?.let { buildFeatureReduction(it) }
    }
  }
}

/** Builds a [FeatureTable] from a JS source: `{type:"shapefile",path}` or a service URL (or `url`). */
private fun featureTable(props: Map<String, Any?>): FeatureTable {
  val source = props["source"] as? Map<*, *>
  if (source != null) {
    if (source["type"] == "shapefile") return ShapefileFeatureTable(source["path"] as? String ?: "")
    (source["url"] as? String)?.let { return ServiceFeatureTable(it) }
  }
  return ServiceFeatureTable(props["url"] as? String ?: "")
}

/** Operational tiled layer backed by a tiled map service URL. */
class TiledLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISTiledLayer = ArcGISTiledLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational map image layer backed by a dynamic map service URL. */
class MapImageLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISMapImageLayer = ArcGISMapImageLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational 3D scene layer (3D objects / integrated mesh) backed by a scene service URL. */
class SceneLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISSceneLayer = ArcGISSceneLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational vector tiled layer backed by a vector tile service URL. */
class VectorTiledLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: ArcGISVectorTiledLayer = ArcGISVectorTiledLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational 3D integrated mesh layer backed by a scene service URL. */
class IntegratedMeshLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: IntegratedMeshLayer = IntegratedMeshLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational 3D point cloud layer backed by a scene service URL. */
class PointCloudLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: PointCloudLayer = PointCloudLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational OGC 3D Tiles layer backed by a 3D Tiles service URL. */
class Ogc3DTilesLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Ogc3DTilesLayer = Ogc3DTilesLayer(url)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational web tiled layer backed by a `{level}/{row}/{col}` URL template. */
class WebTiledLayerRef(appContext: AppContext, urlTemplate: String) : LayerRef(appContext) {
  override val layer: WebTiledLayer = WebTiledLayer.create(urlTemplate)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational OpenStreetMap tiled layer. */
class OpenStreetMapLayerRef(appContext: AppContext) : LayerRef(appContext) {
  override val layer: OpenStreetMapLayer = OpenStreetMapLayer()

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational WMS layer (Web Map Service) backed by a service URL + visible layer names. */
class WmsLayerRef(appContext: AppContext, url: String, layerNames: List<String>) : LayerRef(appContext) {
  override val layer: WmsLayer = WmsLayer(url, layerNames)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational WMTS layer (Web Map Tile Service) backed by a service URL + layer id. */
class WmtsLayerRef(appContext: AppContext, url: String, layerId: String) : LayerRef(appContext) {
  override val layer: WmtsLayer = WmtsLayer(url, layerId)

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational raster layer from a remote image service or a local raster file. */
class RasterLayerRef(appContext: AppContext, source: Map<String, Any?>) : LayerRef(appContext) {
  override val layer: RasterLayer = RasterLayer(rasterFromSource(source))

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Builds a [Raster] from a JS source dict: `{type:"imageService",url}` or `{type:"file",path}`. */
private fun rasterFromSource(s: Map<String, Any?>): Raster =
  if (s["type"] == "file") Raster.createWithPath(s["path"] as? String ?: "")
  else ImageServiceRaster(s["url"] as? String ?: "")

/** Operational KML layer from a remote .kml/.kmz URL or local file. */
class KmlLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: KmlLayer = KmlLayer(KmlDataset(url))

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational WFS layer — a [FeatureLayer] over a [WfsFeatureTable] (Web Feature Service). */
class WfsLayerRef(appContext: AppContext, url: String, tableName: String) : LayerRef(appContext) {
  override val layer: FeatureLayer = FeatureLayer.createWithFeatureTable(
    WfsFeatureTable(url, tableName).apply { featureRequestMode = FeatureRequestMode.OnInteractionCache }
  )

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational OGC API - Features layer — a [FeatureLayer] over an [OgcFeatureCollectionTable]. */
class OgcFeatureLayerRef(appContext: AppContext, url: String, collectionId: String) : LayerRef(appContext) {
  override val layer: FeatureLayer = FeatureLayer.createWithFeatureTable(
    OgcFeatureCollectionTable(url, collectionId).apply { featureRequestMode = FeatureRequestMode.OnInteractionCache }
  )

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}
