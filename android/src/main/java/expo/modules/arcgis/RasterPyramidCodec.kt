package expo.modules.arcgis

import com.arcgismaps.raster.BuildRasterPyramidsParameters
import com.arcgismaps.raster.RasterPyramidCompressionType
import com.arcgismaps.raster.RasterPyramidInfo
import com.arcgismaps.raster.RasterResamplingType

// Raster pyramid overviews — the `RasterPyramids` API added in ArcGIS Maps SDK 300.1.
// Mirrors the JS `RasterPyramidInfo` / `BuildRasterPyramidsParameters` shapes 1:1 with
// ios/RasterPyramidCodec.swift.

/** Serializes [RasterPyramidInfo] to `{ levelCount, isEmbedded, filePath, compressionType, resamplingType }`. */
internal fun serializePyramidInfo(info: RasterPyramidInfo): Map<String, Any?> = mapOf(
  "levelCount" to info.levelCount,
  "isEmbedded" to info.isEmbedded,
  // Embedded overviews live inside the raster itself, so there is no sidecar path to report.
  "filePath" to info.filePath?.takeIf { it.isNotEmpty() },
  "compressionType" to when (info.compressionType) {
    RasterPyramidCompressionType.Default -> "default"
    RasterPyramidCompressionType.Deflate -> "deflate"
    RasterPyramidCompressionType.Jpeg -> "jpeg"
    RasterPyramidCompressionType.JpegYCbCr -> "jpeg-ycbcr"
    RasterPyramidCompressionType.Lzw -> "lzw"
    else -> "none"
  },
  "resamplingType" to when (info.resamplingType) {
    RasterResamplingType.NearestNeighbor -> "nearest-neighbor"
    RasterResamplingType.BilinearInterpolation -> "bilinear-interpolation"
    else -> "automatic"
  },
)

/** Builds [BuildRasterPyramidsParameters] from the JS options dict; absent keys keep SDK defaults. */
internal fun buildPyramidsParameters(dict: Map<String, Any?>?): BuildRasterPyramidsParameters {
  val params = BuildRasterPyramidsParameters()
  dict ?: return params
  (dict["compressionType"] as? String)?.let { params.compressionType = compressionTypeOf(it) }
  (dict["resamplingType"] as? String)?.let { params.resamplingType = resamplingTypeOf(it) }
  (dict["jpegCompressionQuality"] as? Number)?.let { params.jpegCompressionQuality = it.toInt() }
  (dict["maximumLevelCount"] as? Number)?.let { params.maximumLevelCount = it.toInt() }
  (dict["skipFirstLevel"] as? Boolean)?.let { params.skipFirstLevel = it }
  return params
}

private fun compressionTypeOf(value: String): RasterPyramidCompressionType = when (value) {
  "deflate" -> RasterPyramidCompressionType.Deflate
  "jpeg" -> RasterPyramidCompressionType.Jpeg
  "jpeg-ycbcr" -> RasterPyramidCompressionType.JpegYCbCr
  "lzw" -> RasterPyramidCompressionType.Lzw
  "none" -> RasterPyramidCompressionType.None
  else -> RasterPyramidCompressionType.Default
}

private fun resamplingTypeOf(value: String): RasterResamplingType = when (value) {
  "nearest-neighbor" -> RasterResamplingType.NearestNeighbor
  "bilinear-interpolation" -> RasterResamplingType.BilinearInterpolation
  else -> RasterResamplingType.Automatic
}
