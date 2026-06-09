package expo.modules.arcgis

import com.arcgismaps.data.Geodatabase
import com.arcgismaps.data.GeodatabaseFeatureTable
import com.arcgismaps.data.QueryParameters
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * A local mobile geodatabase (`.geodatabase` file) with transactional editing. Opened via
 * `offline.openGeodatabase(path)`. Wrap a batch of edits in [beginTransaction] / [commitTransaction]
 * (persist) or [rollbackTransaction] (discard). Edits target a table by name.
 */
class GeodatabaseRef(appContext: AppContext, private val geodatabase: Geodatabase) :
  SharedObject(appContext) {

  suspend fun beginTransaction() { geodatabase.beginTransaction().getOrThrow() }
  suspend fun commitTransaction() { geodatabase.commitTransaction().getOrThrow() }
  suspend fun rollbackTransaction() { geodatabase.rollbackTransaction().getOrThrow() }
  fun isInTransaction(): Boolean = geodatabase.isInTransaction.value

  /** The names of the geodatabase's feature tables. */
  fun getFeatureTableNames(): List<String> = geodatabase.featureTables.map { it.tableName }

  /** Counts features in [tableName] matching [whereClause] (all when null). */
  suspend fun queryFeatureCount(tableName: String, whereClause: String?): Long {
    val table = tableNamed(tableName) ?: return 0L
    val params = QueryParameters().apply { this.whereClause = whereClause ?: "1=1" }
    return table.queryFeatureCount(params).getOrThrow()
  }

  /** Adds a feature to [tableName]; local until the transaction is committed. */
  suspend fun addFeature(tableName: String, attributes: Map<String, Any?>, geometry: Map<String, Any?>?) {
    val table = tableNamed(tableName)
      ?: throw IllegalStateException("No feature table named $tableName")
    val feature = table.createFeature()
    applyAttributes(feature, attributes)
    geometry?.let { dict -> geometryFromDict(dict)?.let { feature.geometry = it } }
    table.addFeature(feature).getOrThrow()
  }

  /** Returns a `<FeatureLayer layer>`-attachable handle for [tableName], so its edits (within a
   *  transaction) are displayed and persisted on commit. */
  fun getFeatureLayer(tableName: String): FeatureLayerRef {
    val table = tableNamed(tableName) ?: throw IllegalStateException("No feature table named $tableName")
    val ctx = appContext ?: throw IllegalStateException("No app context")
    return FeatureLayerRef(ctx, table)
  }

  private fun tableNamed(name: String): GeodatabaseFeatureTable? =
    geodatabase.featureTables.firstOrNull { it.tableName == name }
}

/** Opens a local mobile geodatabase file and loads it. */
internal suspend fun openGeodatabase(appContext: AppContext, path: String): GeodatabaseRef {
  val geodatabase = Geodatabase(path)
  geodatabase.load().getOrThrow()
  return GeodatabaseRef(appContext, geodatabase)
}
