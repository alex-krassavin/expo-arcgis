package expo.modules.arcgis

import com.arcgismaps.data.Feature
import com.arcgismaps.data.OrderBy
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.SortOrder
import com.arcgismaps.data.SpatialRelationship

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
  (dict["orderBy"] as? List<*>)?.forEach { entry ->
    (entry as? Map<*, *>)?.let {
      val field = it["field"] as? String ?: return@forEach
      val ascending = it["ascending"] as? Boolean ?: true
      params.orderByFields.add(OrderBy(field, if (ascending) SortOrder.Ascending else SortOrder.Descending))
    }
  }
  return params
}

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
