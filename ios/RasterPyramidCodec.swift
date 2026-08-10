import ArcGIS
import Foundation

// Raster pyramid overviews — the `RasterPyramids` API added in ArcGIS Maps SDK 300.1.
// Mirrors the JS `RasterPyramidInfo` / `BuildRasterPyramidsParameters` shapes 1:1 with
// android/src/main/java/expo/modules/arcgis/RasterPyramidCodec.kt.

/// Serializes `RasterPyramidInfo` to `{ levelCount, isEmbedded, filePath, compressionType, resamplingType }`.
func serializePyramidInfo(_ info: RasterPyramidInfo) -> [String: Any] {
  let compressionType: String
  switch info.compressionType {
  case .deflate: compressionType = "deflate"
  case .jpeg: compressionType = "jpeg"
  case .jpegYCbCr: compressionType = "jpeg-ycbcr"
  case .lzw: compressionType = "lzw"
  case .noCompression: compressionType = "none"
  default: compressionType = "default"
  }
  let resamplingType: String
  switch info.resamplingType {
  case .nearestNeighbor: resamplingType = "nearest-neighbor"
  case .bilinearInterpolation: resamplingType = "bilinear-interpolation"
  default: resamplingType = "automatic"
  }
  return [
    "levelCount": info.levelCount,
    "isEmbedded": info.isEmbedded,
    // Embedded overviews live inside the raster itself, so there is no sidecar path to report.
    "filePath": info.fileURL?.path as Any,
    "compressionType": compressionType,
    "resamplingType": resamplingType,
  ]
}

/// Builds `BuildRasterPyramidsParameters` from the JS options dict; absent keys keep SDK defaults.
func buildPyramidsParameters(_ dict: [String: Any]?) -> BuildRasterPyramidsParameters {
  let params = BuildRasterPyramidsParameters()
  guard let dict else { return params }
  if let value = dict["compressionType"] as? String {
    switch value {
    case "deflate": params.compressionType = .deflate
    case "jpeg": params.compressionType = .jpeg
    case "jpeg-ycbcr": params.compressionType = .jpegYCbCr
    case "lzw": params.compressionType = .lzw
    case "none": params.compressionType = .noCompression
    default: params.compressionType = .default
    }
  }
  if let value = dict["resamplingType"] as? String {
    switch value {
    case "nearest-neighbor": params.resamplingType = .nearestNeighbor
    case "bilinear-interpolation": params.resamplingType = .bilinearInterpolation
    default: params.resamplingType = .automatic
    }
  }
  if let n = dict["jpegCompressionQuality"] as? NSNumber { params.jpegCompressionQuality = n.intValue }
  if let n = dict["maximumLevelCount"] as? NSNumber { params.maximumLevelCount = n.intValue }
  // Swift names this `skipsFirstLevel`; Kotlin `skipFirstLevel`. Same setting.
  if let b = dict["skipFirstLevel"] as? Bool { params.skipsFirstLevel = b }
  return params
}
