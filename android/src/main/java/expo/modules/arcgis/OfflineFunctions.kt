package expo.modules.arcgis

import com.arcgismaps.data.Geodatabase
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.portal.Portal
import com.arcgismaps.tasks.exportvectortiles.ExportVectorTilesTask
import com.arcgismaps.tasks.geodatabase.GeodatabaseSyncTask
import com.arcgismaps.tasks.geodatabase.SyncDirection
import com.arcgismaps.mapping.MobileMapPackage
import com.arcgismaps.tasks.offlinemaptask.OfflineMapSyncTask
import com.arcgismaps.tasks.offlinemaptask.OfflineMapTask
import com.arcgismaps.tasks.tilecache.ExportTileCacheTask
import com.arcgismaps.tasks.tilecache.EstimateTileCacheSizeJob
import expo.modules.kotlin.AppContext
import java.io.File
import kotlin.math.log2
import kotlin.math.max
import kotlin.math.roundToInt

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

/**
 * Returns a [JobRef] for an on-demand offline-map download (drive it via `result()` + `onProgress`).
 *
 * When [overrides] is non-null the function builds a `GenerateOfflineMapParameterOverrides` object
 * via `OfflineMapTask.createGenerateOfflineMapParameterOverrides`, trims the `levelIds` list on
 * every `ExportTileCacheParameters` entry to the subset that falls within [minScale, maxScale],
 * and passes the overrides object to `createGenerateOfflineMapJob`.
 *
 * **Vector-tile entries** (`ExportVectorTilesParameters`) expose only `maxLevel` (integer); the
 * SDK provides no minScale/maxScale setter on the override entry — deferred.
 */
internal suspend fun generateOfflineMap(
  appContext: AppContext,
  baseDir: File?,
  portalItemId: String,
  areaOfInterest: Map<String, Any?>,
  downloadName: String,
  overrides: Map<String, Any?>?,
): JobRef {
  val area = geometryFromDict(areaOfInterest) ?: throw IllegalArgumentException("Invalid area of interest")
  baseDir ?: throw IllegalStateException("No download directory available")
  val portalItem =
    PortalItem(Portal("https://www.arcgis.com", Portal.Connection.Anonymous), portalItemId)
  val task = OfflineMapTask(portalItem)
  val parameters = task.createDefaultGenerateOfflineMapParameters(area).getOrThrow()
  val dir = offlineDownloadDir(baseDir, downloadName)

  val paramOverrides = overrides?.let {
    val minScale = (it["minScale"] as? Number)?.toDouble() ?: 0.0
    val maxScale = (it["maxScale"] as? Number)?.toDouble() ?: 0.0
    val ovr = task.createGenerateOfflineMapParameterOverrides(parameters).getOrThrow()
    for ((_, tileCacheParams) in ovr.exportTileCacheParameters) {
      applyScaleToTileCacheParams(tileCacheParams.levelIds, minScale, maxScale)
    }
    // ExportVectorTilesParameters.maxLevel could narrow vector tiles but requires a level number,
    // not a scale denominator; left as-is (deferred).
    ovr
  }

  val job = task.createGenerateOfflineMapJob(parameters, dir.absolutePath, paramOverrides)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("path" to dir.absolutePath)
  }
}

/**
 * Mutates [levelIds] in-place to keep only the levels within [minScale]..[maxScale].
 *
 * Level numbers are approximated from scale denominators using the standard Web Mercator formula:
 *   `level ≈ log2(591_657_550 / scale)` (valid for EPSG:3857 / WKID 102100 tile schemes).
 *
 * For services using a different LOD origin the cutoff will be approximate — see DEFER note.
 */
private fun applyScaleToTileCacheParams(
  levelIds: MutableList<Int>,
  minScale: Double,
  maxScale: Double,
) {
  if (levelIds.isEmpty() || (maxScale <= 0 && minScale <= 0)) return

  val level0Scale = 591_657_550.0

  fun scaleToLevel(scale: Double): Int {
    if (scale <= 0) return Int.MAX_VALUE
    return max(0, log2(level0Scale / scale).roundToInt())
  }

  val maxLevelForScale = if (maxScale > 0) scaleToLevel(maxScale) else Int.MAX_VALUE
  val minLevelForScale = if (minScale > 0) scaleToLevel(minScale) else 0

  levelIds.retainAll { id -> id in minLevelForScale..maxLevelForScale }
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

/**
 * Returns a [JobRef] that syncs a downloaded offline map (`.mmpk` at [mobileMapPackagePath]) with
 * its services — pushes local edits up and pulls server updates down.
 */
internal suspend fun syncOfflineMap(appContext: AppContext, mobileMapPackagePath: String): JobRef {
  val pkg = MobileMapPackage(mobileMapPackagePath)
  pkg.load().getOrThrow()
  val map = pkg.maps.firstOrNull() ?: throw IllegalArgumentException("No map in package")
  val task = OfflineMapSyncTask(map)
  val parameters = task.createDefaultOfflineMapSyncParameters().getOrThrow()
  val job = task.createOfflineMapSyncJob(parameters)
  return JobRef(appContext, job) {
    job.result().getOrThrow()
    mapOf("synced" to true)
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

/**
 * Estimates the on-disk file size and tile count for an [exportTileCache] download WITHOUT
 * downloading. Passes [minScale]/[maxScale] (0.0 = no limit) to
 * [ExportTileCacheTask.createDefaultExportTileCacheParameters] to narrow the estimation to the
 * same scale window that [exportTileCache] would use. Runs the [EstimateTileCacheSizeJob] to
 * completion and returns `{fileSizeBytes, tileCount}`.
 */
internal suspend fun estimateTileCacheSize(
  tileServiceUrl: String,
  areaOfInterest: Map<String, Any?>,
  minScale: Double?,
  maxScale: Double?,
): Map<String, Any?> {
  val area = geometryFromDict(areaOfInterest) ?: throw IllegalArgumentException("Invalid area of interest")
  val task = ExportTileCacheTask(tileServiceUrl)
  val parameters = task.createDefaultExportTileCacheParameters(
    area,
    minScale ?: 0.0,
    maxScale ?: 0.0,
  ).getOrThrow()
  val job = task.createEstimateTileCacheSizeJob(parameters)
  job.start()
  val estimate = job.result().getOrThrow()
  return mapOf("fileSizeBytes" to estimate.fileSize.toDouble(), "tileCount" to estimate.tileCount.toDouble())
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
