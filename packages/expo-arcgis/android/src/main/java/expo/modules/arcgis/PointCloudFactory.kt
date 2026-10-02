package expo.modules.arcgis

import com.arcgismaps.mapping.pointcloud.PointCloudAttributeTransformType
import com.arcgismaps.mapping.pointcloud.PointCloudBitfieldFilter
import com.arcgismaps.mapping.pointcloud.PointCloudClassBreaksRenderer
import com.arcgismaps.mapping.pointcloud.PointCloudColorClassBreak
import com.arcgismaps.mapping.pointcloud.PointCloudColorModulation
import com.arcgismaps.mapping.pointcloud.PointCloudColorStop
import com.arcgismaps.mapping.pointcloud.PointCloudColorUniqueValue
import com.arcgismaps.mapping.pointcloud.PointCloudFilter
import com.arcgismaps.mapping.pointcloud.PointCloudFixedSizeAlgorithm
import com.arcgismaps.mapping.pointcloud.PointCloudRenderer
import com.arcgismaps.mapping.pointcloud.PointCloudReturnFilter
import com.arcgismaps.mapping.pointcloud.PointCloudReturnType
import com.arcgismaps.mapping.pointcloud.PointCloudRgbRenderer
import com.arcgismaps.mapping.pointcloud.PointCloudSizeAlgorithm
import com.arcgismaps.mapping.pointcloud.PointCloudSplatAlgorithm
import com.arcgismaps.mapping.pointcloud.PointCloudStretchRenderer
import com.arcgismaps.mapping.pointcloud.PointCloudUniqueValueRenderer
import com.arcgismaps.mapping.pointcloud.PointCloudValueFilter
import com.arcgismaps.mapping.pointcloud.PointCloudValueFilterMode
import com.arcgismaps.mapping.symbology.SymbolSizeUnits

// Point cloud rendering/filtering — the `com.arcgismaps.mapping.pointcloud` package added in
// ArcGIS Maps SDK 300.1. Mirrors the `PointCloudRenderer` / `PointCloudFilter` JS unions
// (src/ExpoArcgis.types.ts) 1:1 with the Swift side in ios/PointCloudFactory.swift.

/** Builds a [PointCloudRenderer] from the JS `renderer` prop; null clears the layer's renderer. */
internal fun pointCloudRenderer(value: Any?): PointCloudRenderer? {
  val spec = value as? Map<*, *> ?: return null
  val attribute = spec["attributeName"] as? String ?: return null

  val renderer: PointCloudRenderer = when (spec["type"] as? String) {
    "rgb" -> PointCloudRgbRenderer(attribute)

    "class-breaks" -> PointCloudClassBreaksRenderer(
      attribute,
      (spec["classBreaks"] as? List<*>).orEmpty().mapNotNull(::colorClassBreak),
    ).apply { transformType = transformTypeOf(spec["transformType"]) }

    "stretch" -> PointCloudStretchRenderer(
      attribute,
      (spec["stops"] as? List<*>).orEmpty().mapNotNull(::colorStop),
    ).apply { transformType = transformTypeOf(spec["transformType"]) }

    "unique-value" -> PointCloudUniqueValueRenderer(
      attribute,
      (spec["uniqueValues"] as? List<*>).orEmpty().mapNotNull(::colorUniqueValue),
    ).apply { transformType = transformTypeOf(spec["transformType"]) }

    else -> return null
  }

  (spec["pointsPerInch"] as? Number)?.let { renderer.pointsPerInch = it.toDouble() }
  sizeAlgorithmOf(spec["sizeAlgorithm"])?.let { renderer.sizeAlgorithm = it }
  colorModulationOf(spec["colorModulation"])?.let { renderer.colorModulation = it }
  return renderer
}

/** Builds the [PointCloudFilter] list from the JS `filters` prop (an empty list clears them). */
internal fun pointCloudFilters(value: Any?): List<PointCloudFilter> =
  (value as? List<*>).orEmpty().mapNotNull(::pointCloudFilter)

private fun pointCloudFilter(value: Any?): PointCloudFilter? {
  val spec = value as? Map<*, *> ?: return null
  val attribute = spec["attributeName"] as? String ?: return null

  return when (spec["type"] as? String) {
    "value" -> PointCloudValueFilter(
      attribute,
      (spec["values"] as? List<*>).orEmpty().mapNotNull { (it as? Number)?.toDouble() },
      if (spec["mode"] as? String == "exclude") {
        PointCloudValueFilterMode.Exclude
      } else {
        PointCloudValueFilterMode.Include
      },
    )

    "return" -> PointCloudReturnFilter(
      attribute,
      (spec["includedReturns"] as? List<*>).orEmpty().mapNotNull { returnTypeOf(it as? String) },
    )

    "bitfield" -> PointCloudBitfieldFilter(
      attribute,
      (spec["requiredClearBits"] as? List<*>).orEmpty().mapNotNull { (it as? Number)?.toLong() },
      (spec["requiredSetBits"] as? List<*>).orEmpty().mapNotNull { (it as? Number)?.toLong() },
    )

    else -> null
  }
}

private fun colorClassBreak(value: Any?): PointCloudColorClassBreak? {
  val spec = value as? Map<*, *> ?: return null
  val color = colorOf(spec["color"]) ?: return null
  return PointCloudColorClassBreak(
    color,
    (spec["minValue"] as? Number)?.toDouble() ?: 0.0,
    (spec["maxValue"] as? Number)?.toDouble() ?: 0.0,
  ).apply {
    (spec["label"] as? String)?.let { label = it }
    (spec["description"] as? String)?.let { description = it }
  }
}

private fun colorStop(value: Any?): PointCloudColorStop? {
  val spec = value as? Map<*, *> ?: return null
  val color = colorOf(spec["color"]) ?: return null
  return PointCloudColorStop(color, (spec["value"] as? Number)?.toDouble() ?: 0.0).apply {
    (spec["label"] as? String)?.let { label = it }
  }
}

private fun colorUniqueValue(value: Any?): PointCloudColorUniqueValue? {
  val spec = value as? Map<*, *> ?: return null
  val color = colorOf(spec["color"]) ?: return null
  return PointCloudColorUniqueValue(
    color,
    (spec["values"] as? List<*>).orEmpty().mapNotNull { it as? String },
  ).apply {
    (spec["label"] as? String)?.let { label = it }
    (spec["description"] as? String)?.let { description = it }
  }
}

private fun colorModulationOf(value: Any?): PointCloudColorModulation? {
  val spec = value as? Map<*, *> ?: return null
  val attribute = spec["attributeName"] as? String ?: return null
  return PointCloudColorModulation(
    attribute,
    (spec["minValue"] as? Number)?.toDouble() ?: 0.0,
    (spec["maxValue"] as? Number)?.toDouble() ?: 0.0,
  )
}

private fun sizeAlgorithmOf(value: Any?): PointCloudSizeAlgorithm? {
  val spec = value as? Map<*, *> ?: return null
  return when (spec["type"] as? String) {
    "fixed-size" -> PointCloudFixedSizeAlgorithm(
      (spec["size"] as? Number)?.toDouble() ?: 1.0,
      if (spec["sizeUnits"] as? String == "meters") SymbolSizeUnits.Meters else SymbolSizeUnits.Dips,
    )
    "splat" -> PointCloudSplatAlgorithm((spec["scaleFactor"] as? Number)?.toDouble() ?: 1.0)
    else -> null
  }
}

private fun transformTypeOf(value: Any?): PointCloudAttributeTransformType =
  when (value as? String) {
    "absolute-value" -> PointCloudAttributeTransformType.AbsoluteValue
    "modulo-ten" -> PointCloudAttributeTransformType.ModuloTen
    "high-four-bit" -> PointCloudAttributeTransformType.HighFourBit
    "low-four-bit" -> PointCloudAttributeTransformType.LowFourBit
    else -> PointCloudAttributeTransformType.None
  }

private fun returnTypeOf(value: String?): PointCloudReturnType? =
  when (value) {
    "single" -> PointCloudReturnType.Single
    "first-of-many" -> PointCloudReturnType.FirstOfMany
    "last-of-many" -> PointCloudReturnType.LastOfMany
    "last" -> PointCloudReturnType.Last
    else -> null
  }
