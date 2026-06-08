package expo.modules.arcgis

import com.arcgismaps.data.Geodatabase
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.portal.Portal
import com.arcgismaps.tasks.geodatabase.GeodatabaseSyncTask
import com.arcgismaps.tasks.geodatabase.SyncDirection
import com.arcgismaps.tasks.offlinemaptask.OfflineMapTask
import java.io.File

/**
 * Free functions backing the JS `offline` namespace — take maps and data offline via the various
 * download/export tasks. Each is an async job that writes files under the app's storage.
 * Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule` (the base dir is supplied there).
 */

/** Returns a fresh (emptied) download location under [baseDir]. Offline tasks need a non-existent dest. */
internal fun offlineDownloadDir(baseDir: File, name: String): File {
  val dir = File(baseDir, name)
  dir.deleteRecursively()
  return dir
}

internal suspend fun generateOfflineMap(
  baseDir: File?,
  portalItemId: String,
  areaOfInterest: Map<String, Any?>,
  downloadName: String,
): Map<String, Any?> {
  val area = geometryFromDict(areaOfInterest) ?: return mapOf("path" to "")
  baseDir ?: return mapOf("path" to "")
  val portalItem =
    PortalItem(Portal("https://www.arcgis.com", Portal.Connection.Anonymous), portalItemId)
  val task = OfflineMapTask(portalItem)
  val parameters = task.createDefaultGenerateOfflineMapParameters(area).getOrThrow()
  val dir = offlineDownloadDir(baseDir, downloadName)
  val job = task.createGenerateOfflineMapJob(parameters, dir.absolutePath)
  job.start()
  job.result().getOrThrow()
  return mapOf("path" to dir.absolutePath)
}

private fun offlineMapTask(portalItemId: String): OfflineMapTask =
  OfflineMapTask(PortalItem(Portal("https://www.arcgis.com", Portal.Connection.Anonymous), portalItemId))

internal suspend fun preplannedMapAreas(portalItemId: String): List<Map<String, Any?>> {
  val task = offlineMapTask(portalItemId)
  task.load().getOrThrow()
  return task.getPreplannedMapAreas().getOrThrow().mapIndexed { index, area ->
    area.load()
    mapOf("title" to area.portalItem.title, "index" to index)
  }
}

internal suspend fun downloadPreplannedOfflineMap(
  baseDir: File?,
  portalItemId: String,
  areaIndex: Int,
  downloadName: String,
): Map<String, Any?> {
  baseDir ?: return mapOf("path" to "")
  val task = offlineMapTask(portalItemId)
  task.load().getOrThrow()
  val area = task.getPreplannedMapAreas().getOrThrow().getOrNull(areaIndex)
    ?: return mapOf("path" to "")
  val parameters = task.createDefaultDownloadPreplannedOfflineMapParameters(area).getOrThrow()
  val dir = offlineDownloadDir(baseDir, downloadName)
  val job = task.createDownloadPreplannedOfflineMapJob(parameters, dir.absolutePath)
  job.start()
  job.result().getOrThrow()
  return mapOf("path" to dir.absolutePath)
}

internal suspend fun generateGeodatabase(
  baseDir: File?,
  featureServiceUrl: String,
  extent: Map<String, Any?>,
  downloadName: String,
): Map<String, Any?> {
  val area = geometryFromDict(extent) ?: return mapOf("path" to "", "tableCount" to 0)
  baseDir ?: return mapOf("path" to "", "tableCount" to 0)
  val task = GeodatabaseSyncTask(featureServiceUrl)
  val parameters = task.createDefaultGenerateGeodatabaseParameters(area).getOrThrow()
  val file = offlineDownloadDir(baseDir, "$downloadName.geodatabase")
  val job = task.createGenerateGeodatabaseJob(parameters, file.absolutePath)
  job.start()
  val geodatabase = job.result().getOrThrow()
  return mapOf("path" to geodatabase.path, "tableCount" to geodatabase.featureTables.size)
}

internal suspend fun syncGeodatabase(
  geodatabasePath: String,
  featureServiceUrl: String,
): Map<String, Any?> {
  val geodatabase = Geodatabase(geodatabasePath)
  geodatabase.load().getOrThrow()
  val task = GeodatabaseSyncTask(featureServiceUrl)
  val job = task.createSyncGeodatabaseJob(SyncDirection.Bidirectional, true, geodatabase)
  job.start()
  job.result().getOrThrow()
  return mapOf("synced" to true)
}
