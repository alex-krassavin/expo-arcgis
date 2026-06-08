package expo.modules.arcgis

import com.arcgismaps.data.Geodatabase
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.portal.Portal
import com.arcgismaps.tasks.exportvectortiles.ExportVectorTilesTask
import com.arcgismaps.tasks.geodatabase.GeodatabaseSyncTask
import com.arcgismaps.tasks.geodatabase.SyncDirection
import com.arcgismaps.tasks.offlinemaptask.OfflineMapTask
import com.arcgismaps.tasks.tilecache.ExportTileCacheTask
import expo.modules.kotlin.AppContext
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

/** Returns a [JobRef] for an on-demand offline-map download (drive it via `result()` + `onProgress`). */
internal suspend fun generateOfflineMap(
  appContext: AppContext,
  baseDir: File?,
  portalItemId: String,
  areaOfInterest: Map<String, Any?>,
  downloadName: String,
): JobRef {
  val area = geometryFromDict(areaOfInterest) ?: throw IllegalArgumentException("Invalid area of interest")
  baseDir ?: throw IllegalStateException("No download directory available")
  val portalItem =
    PortalItem(Portal("https://www.arcgis.com", Portal.Connection.Anonymous), portalItemId)
  val task = OfflineMapTask(portalItem)
  val parameters = task.createDefaultGenerateOfflineMapParameters(area).getOrThrow()
  val dir = offlineDownloadDir(baseDir, downloadName)
  val job = task.createGenerateOfflineMapJob(parameters, dir.absolutePath)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("path" to dir.absolutePath)
  }
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
  appContext: AppContext,
  baseDir: File?,
  portalItemId: String,
  areaIndex: Int,
  downloadName: String,
): JobRef {
  baseDir ?: throw IllegalStateException("No download directory available")
  val task = offlineMapTask(portalItemId)
  task.load().getOrThrow()
  val area = task.getPreplannedMapAreas().getOrThrow().getOrNull(areaIndex)
    ?: throw IllegalArgumentException("Invalid preplanned area index")
  val parameters = task.createDefaultDownloadPreplannedOfflineMapParameters(area).getOrThrow()
  val dir = offlineDownloadDir(baseDir, downloadName)
  val job = task.createDownloadPreplannedOfflineMapJob(parameters, dir.absolutePath)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("path" to dir.absolutePath)
  }
}

internal suspend fun generateGeodatabase(
  appContext: AppContext,
  baseDir: File?,
  featureServiceUrl: String,
  extent: Map<String, Any?>,
  downloadName: String,
): JobRef {
  val area = geometryFromDict(extent) ?: throw IllegalArgumentException("Invalid extent")
  baseDir ?: throw IllegalStateException("No download directory available")
  val task = GeodatabaseSyncTask(featureServiceUrl)
  val parameters = task.createDefaultGenerateGeodatabaseParameters(area).getOrThrow()
  val file = offlineDownloadDir(baseDir, "$downloadName.geodatabase")
  val job = task.createGenerateGeodatabaseJob(parameters, file.absolutePath)
  return JobRef(appContext, job) {
    val geodatabase = job.result().getOrThrow()
    mapOf("path" to geodatabase.path, "tableCount" to geodatabase.featureTables.size)
  }
}

internal suspend fun syncGeodatabase(
  appContext: AppContext,
  geodatabasePath: String,
  featureServiceUrl: String,
): JobRef {
  val geodatabase = Geodatabase(geodatabasePath)
  geodatabase.load().getOrThrow()
  val task = GeodatabaseSyncTask(featureServiceUrl)
  val job = task.createSyncGeodatabaseJob(SyncDirection.Bidirectional, true, geodatabase)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("synced" to true)
  }
}

internal suspend fun exportTileCache(
  appContext: AppContext,
  baseDir: File?,
  tileServiceUrl: String,
  areaOfInterest: Map<String, Any?>,
  downloadName: String,
): JobRef {
  val area = geometryFromDict(areaOfInterest) ?: throw IllegalArgumentException("Invalid area of interest")
  baseDir ?: throw IllegalStateException("No download directory available")
  val task = ExportTileCacheTask(tileServiceUrl)
  val parameters = task.createDefaultExportTileCacheParameters(area, 0.0, 0.0).getOrThrow()
  val file = offlineDownloadDir(baseDir, "$downloadName.tpkx")
  val job = task.createExportTileCacheJob(parameters, file.absolutePath)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("path" to file.absolutePath)
  }
}

internal suspend fun exportVectorTiles(
  appContext: AppContext,
  baseDir: File?,
  vectorTileServiceUrl: String,
  areaOfInterest: Map<String, Any?>,
  downloadName: String,
): JobRef {
  val area = geometryFromDict(areaOfInterest) ?: throw IllegalArgumentException("Invalid area of interest")
  baseDir ?: throw IllegalStateException("No download directory available")
  val task = ExportVectorTilesTask(vectorTileServiceUrl)
  val parameters = task.createDefaultExportVectorTilesParameters(area, 0.0).getOrThrow()
  val file = offlineDownloadDir(baseDir, "$downloadName.vtpk")
  val job = task.createExportVectorTilesJob(parameters, file.absolutePath)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("path" to file.absolutePath)
  }
}
