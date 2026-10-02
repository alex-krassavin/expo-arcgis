package expo.modules.arcgis

import com.arcgismaps.data.Feature
import com.arcgismaps.data.OrderBy
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.SortOrder
import com.arcgismaps.data.SpatialRelationship
import com.arcgismaps.data.StatisticDefinition
import com.arcgismaps.data.StatisticRecord
import com.arcgismaps.data.StatisticType
import com.arcgismaps.data.StatisticsQueryParameters
import com.arcgismaps.mapping.popup.FieldsPopupElement
import com.arcgismaps.mapping.popup.MediaPopupElement
import com.arcgismaps.mapping.popup.PopupMedia
import com.arcgismaps.mapping.popup.PopupMediaType
import com.arcgismaps.mapping.layers.VectorTileFeature
import com.arcgismaps.mapping.layers.VectorTileStyleLayerType
import com.arcgismaps.mapping.view.IdentifyLayerResult
import java.time.Instant

/**
 * Builds [QueryParameters] from a JS query dict and serializes [Feature]s back to JS.
 * Shared by [FeatureLayerRef]'s async query functions.
 */

internal fun buildQueryParameters(dict: Map<*, *>?): QueryParameters {
  val params = QueryParameters()
  if (dict == null) return params
  (dict["whereClause"] as? String)?.let { params.whereClause = it }
  (dict["geometry"] as? Map<*, *>)?.let { params.geometry = geometryFromDict(it) }
  (dict["spatialRelationship"] as? String)?.let { params.spatialRelationship = querySpatialRelationship(it) }
  (dict["maxFeatures"] as? Number)?.toInt()?.let { params.maxFeatures = it }
  (dict["returnGeometry"] as? Boolean)?.let { params.returnGeometry = it }
  (dict["resultOffset"] as? Number)?.toInt()?.let { params.resultOffset = it }
  (dict["objectIds"] as? List<*>)?.mapNotNull { (it as? Number)?.toLong() }?.let { params.objectIds.addAll(it) }
  params.orderByFields.addAll(buildOrderBy(dict["orderBy"]))
  params.orderByFields.addAll(parseOrderByFields(dict["orderByFields"]))
  return params
}

/** Parses `["POP DESC", "NAME ASC"]` strings into [OrderBy] objects. */
private fun parseOrderByFields(value: Any?): List<OrderBy> {
  val strings = value as? List<*> ?: return emptyList()
  return strings.mapNotNull { item ->
    val token = item as? String ?: return@mapNotNull null
    val parts = token.trim().split(Regex("\\s+"), limit = 2)
    val fieldName = parts[0]
    val ascending = parts.size < 2 || parts[1].uppercase() != "DESC"
    OrderBy(fieldName, if (ascending) SortOrder.Ascending else SortOrder.Descending)
  }
}

/**
 * Extracts the `outFields` list from a query dict for use in [serializeFeature].
 * Returns an empty list when not specified (= all fields).
 */
internal fun outFieldsFromQuery(dict: Map<*, *>?): List<String> =
  (dict?.get("outFields") as? List<*>)?.filterIsInstance<String>() ?: emptyList()

private fun buildOrderBy(value: Any?): List<OrderBy> =
  (value as? List<*>)?.mapNotNull { entry ->
    (entry as? Map<*, *>)?.let {
      val field = it["field"] as? String ?: return@mapNotNull null
      OrderBy(field, if (it["ascending"] as? Boolean ?: true) SortOrder.Ascending else SortOrder.Descending)
    }
  } ?: emptyList()

private fun querySpatialRelationship(value: String): SpatialRelationship = when (value) {
  "contains" -> SpatialRelationship.Contains
  "crosses" -> SpatialRelationship.Crosses
  "disjoint" -> SpatialRelationship.Disjoint
  "envelopeIntersects" -> SpatialRelationship.EnvelopeIntersects
  "equals" -> SpatialRelationship.Equals
  "overlaps" -> SpatialRelationship.Overlaps
  "touches" -> SpatialRelationship.Touches
  "within" -> SpatialRelationship.Within
  "relate" -> SpatialRelationship.Relate
  else -> SpatialRelationship.Intersects
}

internal fun serializeFeature(feature: Feature, outFields: List<String> = emptyList()): Map<String, Any?> {
  val attrs = serializeAttributes(feature.attributes)
  val filteredAttrs = if (outFields.isEmpty() || outFields == listOf("*")) attrs
                      else attrs.filterKeys { it in outFields }
  val result = mutableMapOf<String, Any?>("attributes" to filteredAttrs)
  feature.geometry?.let { result["geometry"] = dictFromGeometry(it) }
  return result
}

/** Converts feature attributes to JS-friendly values (dates → epoch milliseconds, any other
 *  non-primitive → string). */
internal fun serializeAttributes(attributes: Map<String, Any?>): Map<String, Any?> =
  attributes.mapValues { (_, value) ->
    when (value) {
      null, is String, is Boolean, is Number -> value
      // Date fields arrive as `Instant`. Left to `toString()` they reach JS as ISO-8601 text while
      // iOS sends epoch milliseconds, so the same attribute has a different type per platform.
      is Instant -> value.toEpochMilli()
      else -> value.toString()
    }
  }

// region Statistics

internal fun buildStatisticsQueryParameters(dict: Map<*, *>): StatisticsQueryParameters {
  val definitions = (dict["statistics"] as? List<*>)?.mapNotNull { stat ->
    (stat as? Map<*, *>)?.let {
      val field = it["field"] as? String ?: return@mapNotNull null
      StatisticDefinition(field, statisticType(it["type"] as? String), it["outName"] as? String ?: "")
    }
  } ?: emptyList()
  val params = StatisticsQueryParameters(definitions)
  (dict["whereClause"] as? String)?.let { params.whereClause = it }
  (dict["groupBy"] as? List<*>)?.filterIsInstance<String>()?.let { params.groupByFieldNames.addAll(it) }
  params.orderByFields.addAll(buildOrderBy(dict["orderBy"]))
  return params
}

private fun statisticType(value: String?): StatisticType = when (value) {
  "count" -> StatisticType.Count
  "sum" -> StatisticType.Sum
  "min" -> StatisticType.Minimum
  "max" -> StatisticType.Maximum
  "standardDeviation" -> StatisticType.StandardDeviation
  "variance" -> StatisticType.Variance
  else -> StatisticType.Average
}

internal fun serializeStatisticRecord(record: StatisticRecord): Map<String, Any?> =
  mapOf("group" to serializeAttributes(record.group), "statistics" to serializeAttributes(record.statistics))

// region Editing

/** Applies JS attribute values onto a feature (used by add / update). */
internal fun applyAttributes(feature: Feature, attributes: Map<*, *>) {
  attributes.forEach { (key, value) -> if (value != null) feature.attributes[key.toString()] = value }
}

// region Identify

/** Serializes one layer's identify hits — its name and the identified features. */
internal fun serializeIdentifyResult(result: IdentifyLayerResult): Map<String, Any?> = mapOf(
  "layerName" to result.layerContent.name,
  "features" to result.geoElements.filterIsInstance<Feature>().map { serializeFeature(it) },
  // ArcGIS 300.1 made vector tiled layers identifiable. Their hits are `VectorTileFeature`s, not
  // `Feature`s — no object id, no service schema — so they get their own list rather than being
  // squeezed into `features`, which would change what existing callers read.
  "vectorTileFeatures" to result.geoElements.filterIsInstance<VectorTileFeature>()
    .map { serializeVectorTileFeature(it) },
)

/** Serializes a [VectorTileFeature] to `{ id, styleLayerId, styleLayerType, attributes, geometry }`. */
internal fun serializeVectorTileFeature(feature: VectorTileFeature): Map<String, Any?> = mapOf(
  "id" to feature.id,
  "styleLayerId" to feature.styleLayerId,
  "styleLayerType" to when (feature.styleLayerType) {
    VectorTileStyleLayerType.Background -> "background"
    VectorTileStyleLayerType.Circle -> "circle"
    VectorTileStyleLayerType.Fill -> "fill"
    VectorTileStyleLayerType.Line -> "line"
    else -> "symbol"
  },
  "attributes" to serializeAttributes(feature.attributes),
  // The SDK only returns geometry for point-based features; line and fill hits carry none.
  "geometry" to feature.geometry?.let { dictFromGeometry(it) },
)

/** Evaluates each identified popup and flattens its fields into `{ title, fields: [{label, value}] }`. */
internal suspend fun serializePopups(results: List<IdentifyLayerResult>): List<Map<String, Any?>> {
  val output = mutableListOf<Map<String, Any?>>()
  for (result in results) {
    for (popup in result.popups) {
      popup.evaluateExpressions()
      val fields = mutableListOf<Map<String, Any?>>()
      val media = mutableListOf<Map<String, Any?>>()
      for (element in popup.evaluatedElements) {
        if (element is FieldsPopupElement) {
          element.labels.zip(element.formattedValues).forEach { (label, value) ->
            fields.add(mapOf("label" to label, "value" to value))
          }
        }
        // Media elements were being skipped entirely, so a popup's images and charts never
        // reached JS. `alternativeText` is the 300.1 addition.
        if (element is MediaPopupElement) {
          element.media.forEach { media.add(serializePopupMedia(it)) }
        }
      }
      output.add(mapOf("title" to popup.title, "fields" to fields, "media" to media))
    }
  }
  return output
}

/** Serializes a [PopupMedia] to `{ title, caption, alternativeText, type, sourceUrl, linkUrl }`. */
private fun serializePopupMedia(item: PopupMedia): Map<String, Any?> = mapOf(
  "title" to item.title,
  "caption" to item.caption,
  // Added in ArcGIS 300.1; empty when the popup author set none.
  "alternativeText" to item.alternativeText,
  "type" to when (item.type) {
    PopupMediaType.Image -> "image"
    PopupMediaType.BarChart -> "bar-chart"
    PopupMediaType.ColumnChart -> "column-chart"
    PopupMediaType.LineChart -> "line-chart"
    PopupMediaType.PieChart -> "pie-chart"
    else -> "unknown"
  },
  "sourceUrl" to item.value?.sourceUrl?.takeIf { it.isNotEmpty() },
  "linkUrl" to item.value?.linkUrl?.takeIf { it.isNotEmpty() },
)
