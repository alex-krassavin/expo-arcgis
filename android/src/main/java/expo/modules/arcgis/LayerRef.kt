package expo.modules.arcgis

import android.util.Base64
import com.arcgismaps.data.ArcGISFeature
import com.arcgismaps.data.ArcGISFeatureTable
import com.arcgismaps.data.Feature
import com.arcgismaps.data.FeatureCollection
import com.arcgismaps.data.FeatureCollectionTable
import com.arcgismaps.data.FeatureRequestMode
import com.arcgismaps.data.FeatureTable
import com.arcgismaps.data.Field
import com.arcgismaps.data.FieldType
import com.arcgismaps.data.GeoPackage
import com.arcgismaps.data.QueryFeatureFields
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.ServiceFeatureTable
import com.arcgismaps.data.ShapefileFeatureTable
import com.arcgismaps.data.OgcFeatureCollectionTable
import com.arcgismaps.data.WfsFeatureTable
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.mapping.layers.AnnotationLayer
import com.arcgismaps.mapping.layers.DisplayFilter
import com.arcgismaps.mapping.layers.ManualDisplayFilterDefinition
import com.arcgismaps.mapping.layers.ScaleDisplayFilterDefinition
import com.arcgismaps.mapping.layers.ScaleRangeDisplayFilter
import com.arcgismaps.mapping.symbology.DictionaryRenderer
import com.arcgismaps.mapping.symbology.DictionarySymbolStyle
import com.arcgismaps.portal.Portal
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.arcgismaps.mapping.layers.ArcGISMapImageLayer
import com.arcgismaps.mapping.layers.ArcGISSceneLayer
import com.arcgismaps.mapping.layers.ArcGISTiledLayer
import com.arcgismaps.mapping.layers.ArcGISVectorTiledLayer
import com.arcgismaps.mapping.layers.BuildingSceneLayer
import com.arcgismaps.mapping.layers.DimensionLayer
import com.arcgismaps.mapping.layers.FeatureCollectionLayer
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.layers.GroupLayer
import com.arcgismaps.mapping.layers.IntegratedMeshLayer
import com.arcgismaps.mapping.layers.Layer
import com.arcgismaps.mapping.layers.OrientedImageryLayer
import com.arcgismaps.mapping.layers.SubtypeFeatureLayer
import com.arcgismaps.mapping.layers.Ogc3DTilesLayer
import com.arcgismaps.mapping.layers.OpenStreetMapLayer
import com.arcgismaps.mapping.layers.PointCloudLayer
import com.arcgismaps.mapping.layers.RasterLayer
import com.arcgismaps.mapping.layers.WebTiledLayer
import com.arcgismaps.mapping.layers.KmlLayer
import com.arcgismaps.mapping.layers.WmsLayer
import com.arcgismaps.mapping.layers.WmtsLayer
import com.arcgismaps.mapping.kml.KmlDataset
import com.arcgismaps.mapping.view.Graphic
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
        "minScale" -> layer.minScale = (value as? Number)?.toDouble()?.takeIf { it != 0.0 }
        "maxScale" -> layer.maxScale = (value as? Number)?.toDouble()?.takeIf { it != 0.0 }
      }
    }
  }
}

/** Operational FeatureLayer from a feature service URL or a local shapefile. */
class FeatureLayerRef(appContext: AppContext, private val table: FeatureTable) : LayerRef(appContext) {
  override val layer: FeatureLayer = FeatureLayer.createWithFeatureTable(table)
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  /** Builds the layer from declarative props (a feature-service URL or a local shapefile). */
  constructor(appContext: AppContext, props: Map<String, Any?>) : this(appContext, featureTable(props))

  /** Lazily-built branch-versioning handle for this layer's service geodatabase (cached). */
  private var cachedServiceGeodatabase: ServiceGeodatabaseRef? = null

  /** Returns the features matching `query` (all features when null). Loads attributes in full. */
  suspend fun queryFeatures(query: Map<String, Any?>?): List<Map<String, Any?>> {
    val params = buildQueryParameters(query)
    val outFields = outFieldsFromQuery(query)
    val result = if (table is ServiceFeatureTable) {
      table.queryFeatures(params, QueryFeatureFields.LoadAll).getOrThrow()
    } else {
      table.queryFeatures(params).getOrThrow()
    }
    return result.map { serializeFeature(it, outFields) }
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

  /**
   * Adds a feature created from the named template (inheriting its prototype attributes), then
   * optionally applies [attributes] on top and sets [geometry]. When [apply] is not `false`,
   * pushes the edit and returns the new object id; pass `apply = false` for a local-only edit.
   */
  suspend fun addFeatureWithTemplate(templateName: String, attributes: Map<String, Any?>?, geometry: Map<String, Any?>?, apply: Boolean?): Long? {
    table.load().getOrThrow()
    val arcGISTable = table as? ArcGISFeatureTable
      ?: throw IllegalStateException("addFeatureWithTemplate requires an ArcGIS feature table (not a shapefile or WFS table)")
    val template = arcGISTable.getFeatureTemplate(templateName)
      ?: throw IllegalArgumentException("No feature template named '$templateName' found in the table")
    val geom = geometry?.let { geometryFromDict(it) }
    val feature = arcGISTable.createFeature(template, geom)
    if (attributes != null) applyAttributes(feature, attributes)
    table.addFeature(feature).getOrThrow()
    if (apply == false) return null
    return persistEdits()
  }

  /**
   * Adds a feature created from the named subtype (sets the subtype field and inherits its
   * default attribute values), then optionally applies [attributes] on top and sets [geometry].
   * When [apply] is not `false`, pushes the edit and returns the new object id; pass
   * `apply = false` for a local-only edit.
   */
  suspend fun addFeatureWithSubtype(subtypeName: String, attributes: Map<String, Any?>?, geometry: Map<String, Any?>?, apply: Boolean?): Long? {
    table.load().getOrThrow()
    val arcGISTable = table as? ArcGISFeatureTable
      ?: throw IllegalStateException("addFeatureWithSubtype requires an ArcGIS feature table (not a shapefile or WFS table)")
    val subtype = arcGISTable.featureSubtypes.firstOrNull { it.name == subtypeName }
      ?: throw IllegalArgumentException("No feature subtype named '$subtypeName' found in the table")
    val geom = geometry?.let { geometryFromDict(it) }
    val feature = arcGISTable.createFeature(subtype, geom)
    if (attributes != null) applyAttributes(feature, attributes)
    table.addFeature(feature).getOrThrow()
    if (apply == false) return null
    return persistEdits()
  }

  /**
   * Adds a feature. When `apply` is not `false`, pushes the edit and returns the new object id;
   * pass `apply = false` to make a local-only edit (batch with `applyEdits`).
   */
  suspend fun addFeature(attributes: Map<String, Any?>, geometry: Map<String, Any?>?, apply: Boolean?): Long? {
    val feature = table.createFeature()
    applyAttributes(feature, attributes)
    geometry?.let { dict -> geometryFromDict(dict)?.let { feature.geometry = it } }
    table.addFeature(feature).getOrThrow()
    if (apply == false) return null
    return persistEdits()
  }

  /** Updates the feature with `objectId`. Pass `apply = false` for a local-only edit. */
  suspend fun updateFeature(objectId: Long, changes: Map<String, Any?>, apply: Boolean?) {
    val feature = featureByObjectId(objectId) ?: return
    (changes["attributes"] as? Map<*, *>)?.let { applyAttributes(feature, it) }
    (changes["geometry"] as? Map<*, *>)?.let { geometryFromDict(it)?.let { g -> feature.geometry = g } }
    table.updateFeature(feature).getOrThrow()
    if (apply != false) persistEdits()
  }

  /** Deletes the feature with `objectId`. Pass `apply = false` for a local-only edit. */
  suspend fun deleteFeature(objectId: Long, apply: Boolean?) {
    val feature = featureByObjectId(objectId) ?: return
    table.deleteFeature(feature).getOrThrow()
    if (apply != false) persistEdits()
  }

  /** Pushes all pending local edits to the service in one batch; returns each edit's result. */
  suspend fun applyEdits(): List<Map<String, Any?>> {
    val serviceTable = table as? ServiceFeatureTable ?: return emptyList()
    return serviceTable.applyEdits().getOrThrow().map {
      mapOf("objectId" to it.objectId, "completedWithErrors" to it.completedWithErrors)
    }
  }

  /** Discards all pending local edits (since the last `applyEdits`). */
  suspend fun undoLocalEdits() {
    (table as? ServiceFeatureTable)?.undoLocalEdits()?.getOrThrow()
  }

  /**
   * Returns the branch-versioning handle for this layer's service geodatabase. Loads the table
   * first (so the geodatabase is populated). Throws if the layer is not backed by a feature
   * service. The same handle is returned on repeat calls.
   */
  suspend fun getServiceGeodatabase(): ServiceGeodatabaseRef {
    cachedServiceGeodatabase?.let { return it }
    val serviceTable = table as? ServiceFeatureTable
      ?: throw IllegalStateException("Layer is not backed by a service feature table")
    serviceTable.load().getOrThrow()
    val geodatabase = serviceTable.serviceGeodatabase
      ?: throw IllegalStateException("Service geodatabase unavailable for this layer")
    cachedServiceGeodatabase?.let { return it }  // guard the load race
    val ctx = appContext ?: throw IllegalStateException("No app context")
    return ServiceGeodatabaseRef(ctx, geodatabase).also { cachedServiceGeodatabase = it }
  }

  /** Queries features related to `objectId` (across all relationships); returns groups by relationship. */
  suspend fun queryRelatedFeatures(objectId: Long): List<Map<String, Any?>> {
    val arcgisTable = table as? ArcGISFeatureTable ?: return emptyList()
    val feature = featureByObjectId(objectId) as? ArcGISFeature ?: return emptyList()
    return arcgisTable.queryRelatedFeatures(feature).getOrThrow().map { result ->
      mapOf(
        "relationshipId" to (result.relationshipInfo?.id ?: -1L),
        "features" to result.map { serializeFeature(it) },
      )
    }
  }

  /** Queries the attachments for the feature with `objectId`; returns `[{id, name, contentType, size}]`. */
  suspend fun queryAttachments(objectId: Long): List<Map<String, Any?>> {
    val feature = featureByObjectId(objectId) as? ArcGISFeature ?: return emptyList()
    return feature.fetchAttachments().getOrThrow().map { attachment ->
      mapOf(
        "id" to attachment.id,
        "name" to attachment.name,
        "contentType" to attachment.contentType,
        "size" to attachment.size,
      )
    }
  }

  /** Decodes `dataBase64`, adds it as an attachment to the feature, then persists the edit. */
  suspend fun addAttachment(objectId: Long, name: String, contentType: String, dataBase64: String) {
    val feature = featureByObjectId(objectId) as? ArcGISFeature ?: return
    val bytes = Base64.decode(dataBase64, Base64.NO_WRAP)
    feature.addAttachment(name, contentType, bytes).getOrThrow()
    persistEdits()
  }

  /** Fetches the binary data for the attachment with `attachmentId` and returns it as base64. */
  suspend fun fetchAttachment(objectId: Long, attachmentId: Long): String {
    val feature = featureByObjectId(objectId) as? ArcGISFeature
      ?: error("Feature not found: $objectId")
    val attachment = feature.fetchAttachments().getOrThrow()
      .firstOrNull { it.id == attachmentId }
      ?: error("Attachment not found: $attachmentId")
    val bytes = attachment.fetchData().getOrThrow()
    return Base64.encodeToString(bytes, Base64.NO_WRAP)
  }

  /** Deletes the attachment with `attachmentId` from the feature with `objectId`, then persists. */
  suspend fun deleteAttachment(objectId: Long, attachmentId: Long) {
    val feature = featureByObjectId(objectId) as? ArcGISFeature
      ?: error("Feature not found: $objectId")
    val attachment = feature.fetchAttachments().getOrThrow()
      .firstOrNull { it.id == attachmentId }
      ?: error("Attachment not found: $attachmentId")
    feature.deleteAttachment(attachment).getOrThrow()
    persistEdits()
  }

  /** Decodes `dataBase64` and updates the attachment with `attachmentId`, then persists. */
  suspend fun updateAttachment(
    objectId: Long, attachmentId: Long,
    name: String, contentType: String, dataBase64: String,
  ) {
    val feature = featureByObjectId(objectId) as? ArcGISFeature
      ?: error("Feature not found: $objectId")
    val attachment = feature.fetchAttachments().getOrThrow()
      .firstOrNull { it.id == attachmentId }
      ?: error("Attachment not found: $attachmentId")
    val bytes = Base64.decode(dataBase64, Base64.NO_WRAP)
    feature.updateAttachment(attachment, name, contentType, bytes).getOrThrow()
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

  /**
   * Builds a [PortalItem] from a `dictionaryRenderer` prop dict. Prefers `portalItemUrl`
   * (item id extracted from the `id=` query parameter) over `styleName` (treated as an item id
   * on ArcGIS Online). Returns `null` when neither key resolves to a usable item id.
   */
  private fun portalItemFromDictionaryRendererDict(dict: Map<*, *>): PortalItem? {
    // portalItemUrl takes precedence — extract item id from `id=` query parameter
    val portalItemUrl = dict["portalItemUrl"] as? String
    if (portalItemUrl != null) {
      val uri = android.net.Uri.parse(portalItemUrl)
      val itemId = uri.getQueryParameter("id")
      if (!itemId.isNullOrEmpty()) {
        // Derive portal base URL from scheme + authority (e.g. https://www.arcgis.com)
        val portalBase = "${uri.scheme ?: "https"}://${uri.authority ?: "www.arcgis.com"}"
        val portal = Portal(portalBase, Portal.Connection.Anonymous)
        return PortalItem(portal, itemId)
      }
    }
    // styleName: treat as portal item id on ArcGIS Online (anonymous)
    val styleName = dict["styleName"] as? String
    if (!styleName.isNullOrEmpty()) {
      val portal = Portal("https://www.arcgis.com", Portal.Connection.Anonymous)
      return PortalItem(portal, styleName)
    }
    return null
  }

  /**
   * Launches an async task that loads [DictionarySymbolStyle] from the provided prop dict and
   * sets a [DictionaryRenderer] on the layer. If the load fails, the renderer is left unchanged.
   */
  private fun applyDictionaryRenderer(dict: Map<*, *>) {
    val portalItem = portalItemFromDictionaryRendererDict(dict) ?: return
    val style = DictionarySymbolStyle(portalItem)
    scope.launch {
      style.load().onFailure { e ->
        android.util.Log.e("ExpoArcgis", "DictionarySymbolStyle load failed: $e")
        return@launch
      }
      layer.renderer = DictionaryRenderer(style)
    }
  }

  override fun applyProps(changed: Map<String, Any?>) {
    applyCommonProps(changed)
    if (changed.containsKey("renderer")) {
      val renderer = (changed["renderer"] as? Map<*, *>)?.let { buildRenderer(it) }
      if (renderer != null) layer.renderer = renderer else layer.resetRenderer()
    }
    if (changed.containsKey("dictionaryRenderer")) {
      val dict = changed["dictionaryRenderer"] as? Map<*, *>
      if (dict != null) {
        applyDictionaryRenderer(dict)
      } else {
        layer.resetRenderer()
      }
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
    if (changed.containsKey("displayFilter")) {
      val filterDict = changed["displayFilter"] as? Map<*, *>
      if (filterDict != null) {
        val whereClause = filterDict["whereClause"] as? String ?: ""
        val name = filterDict["name"] as? String ?: ""
        val filter = DisplayFilter.Companion.createWithNameAndWhereClause(name, whereClause)
        layer.displayFilterDefinition = ManualDisplayFilterDefinition(filter, listOf(filter))
      } else {
        layer.displayFilterDefinition = null
      }
    }
    if (changed.containsKey("scaleDisplayFilter")) {
      val entries = changed["scaleDisplayFilter"] as? List<*>
      if (!entries.isNullOrEmpty()) {
        val scaleFilters = entries.mapNotNull { entry ->
          val dict = entry as? Map<*, *> ?: return@mapNotNull null
          val whereClause = dict["whereClause"] as? String ?: return@mapNotNull null
          val minScale = (dict["minScale"] as? Number)?.toDouble()?.takeIf { it != 0.0 }
          val maxScale = (dict["maxScale"] as? Number)?.toDouble()?.takeIf { it != 0.0 }
          ScaleRangeDisplayFilter("", whereClause, minScale, maxScale)
        }
        layer.displayFilterDefinition = ScaleDisplayFilterDefinition(scaleFilters)
      } else {
        layer.displayFilterDefinition = null
      }
    }
    if (changed.containsKey("refreshInterval")) {
      val seconds = (changed["refreshInterval"] as? Number)?.toLong() ?: 0L
      layer.refreshInterval = if (seconds > 0L) seconds * 1000L else null
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

/** Operational annotation layer (map text stored as annotation features) from a feature service URL. */
class AnnotationLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Layer = AnnotationLayer(url)
  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational dimension layer (engineering/measurement dimensions) from a feature service URL. */
class DimensionLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Layer = DimensionLayer(url)
  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational 3D building scene layer (disciplines + building levels) from a scene service URL. */
class BuildingSceneLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Layer = BuildingSceneLayer(url)
  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational oriented imagery layer (photos with position/orientation) from a feature service URL. */
class OrientedImageryLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Layer = OrientedImageryLayer(url)
  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/** Operational subtype feature layer (one sublayer per subtype) from a feature service URL. */
class SubtypeFeatureLayerRef(appContext: AppContext, url: String) : LayerRef(appContext) {
  override val layer: Layer = SubtypeFeatureLayer(ServiceFeatureTable(url))
  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/**
 * Container layer ([GroupLayer]) — holds child layers as a single unit. Acts as a layer host for
 * its declared children (they add themselves to the group instead of the map).
 */
class GroupLayerRef(appContext: AppContext) : LayerRef(appContext) {
  private val group = GroupLayer(emptyList())
  override val layer: Layer = group

  fun addLayer(ref: LayerRef) {
    group.layers.add(ref.layer)
  }

  fun removeLayer(ref: LayerRef) {
    group.layers.remove(ref.layer)
  }

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

/**
 * In-memory [FeatureCollectionLayer] — a layer built from a client-side schema (`fields`) and
 * `features` (no service). Features become graphics in a [FeatureCollectionTable].
 */
class FeatureCollectionLayerRef(appContext: AppContext, props: Map<String, Any?>) : LayerRef(appContext) {
  private val table: FeatureCollectionTable = run {
    val fields = (props["fields"] as? List<*> ?: emptyList<Any?>())
      .mapNotNull { (it as? Map<*, *>)?.let(::makeFeatureCollectionField) }
    val graphics = (props["features"] as? List<*> ?: emptyList<Any?>()).mapNotNull { spec ->
      val s = spec as? Map<*, *> ?: return@mapNotNull null
      Graphic().apply {
        geometry = (s["geometry"] as? Map<*, *>)?.let { geometryFromDict(it) }
        (s["attributes"] as? Map<*, *>)?.forEach { (k, v) -> attributes[k.toString()] = v }
      }
    }
    FeatureCollectionTable(graphics, fields).apply {
      renderer = (props["renderer"] as? Map<*, *>)?.let { buildRenderer(it) }
    }
  }
  override val layer: Layer = FeatureCollectionLayer(FeatureCollection().apply { tables.add(table) })

  override fun applyProps(changed: Map<String, Any?>) {
    applyCommonProps(changed)
    if (changed.containsKey("renderer")) {
      table.renderer = (changed["renderer"] as? Map<*, *>)?.let { buildRenderer(it) }
    }
  }
}

/**
 * Operational layer loaded from a local GeoPackage (`.gpkg`) file. Opens the GeoPackage
 * asynchronously, picks the feature table by [tableName] (or the first when null), wraps it in a
 * [FeatureLayer], and attaches it to the placeholder [GroupLayer] once ready.
 */
class GeoPackageLayerRef(appContext: AppContext, path: String, tableName: String?) :
  LayerRef(appContext) {

  private val group = GroupLayer(emptyList())
  override val layer: Layer = group
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  init {
    scope.launch {
      val pkg = GeoPackage(path)
      pkg.load().onFailure { return@launch }
      val tables = pkg.geoPackageFeatureTables
      if (tables.isEmpty()) return@launch
      val table = if (tableName != null) {
        tables.firstOrNull { it.tableName == tableName } ?: return@launch
      } else {
        tables[0]
      }
      val featureLayer = FeatureLayer.createWithFeatureTable(table)
      group.layers.add(featureLayer)
    }
  }

  override fun applyProps(changed: Map<String, Any?>) = applyCommonProps(changed)
}

private fun makeFeatureCollectionField(d: Map<*, *>): Field {
  val name = d["name"] as? String ?: ""
  return Field(
    featureCollectionFieldType(d["type"] as? String),
    name,
    d["alias"] as? String ?: name,
    (d["length"] as? Number)?.toInt() ?: 255,
    null,
    true,
    true,
  )
}

private fun featureCollectionFieldType(value: String?): FieldType = when (value) {
  "int16" -> FieldType.Int16
  "integer" -> FieldType.Int32
  "long" -> FieldType.Int64
  "double" -> FieldType.Float64
  "date" -> FieldType.Date
  else -> FieldType.Text
}
