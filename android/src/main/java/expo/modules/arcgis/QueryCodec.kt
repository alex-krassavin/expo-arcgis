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
import com.arcgismaps.mapping.view.IdentifyLayerResult

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
  return params
}

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

internal fun serializeFeature(feature: Feature): Map<String, Any?> {
  val result = mutableMapOf<String, Any?>("attributes" to serializeAttributes(feature.attributes))
  feature.geometry?.let { result["geometry"] = dictFromGeometry(it) }
  return result
}

/** Converts feature attributes to JS-friendly values (non-primitives, e.g. dates, → string). */
internal fun serializeAttributes(attributes: Map<String, Any?>): Map<String, Any?> =
  attributes.mapValues { (_, value) ->
    when (value) {
      null, is String, is Boolean, is Number -> value
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
)
