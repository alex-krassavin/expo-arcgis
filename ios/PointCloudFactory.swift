import ArcGIS
import UIKit

// Point cloud rendering/filtering — the API added in ArcGIS Maps SDK 300.1. Mirrors the
// `PointCloudRenderer` / `PointCloudFilter` JS unions (src/ExpoArcgis.types.ts) 1:1 with the
// Kotlin side in android/src/main/java/expo/modules/arcgis/PointCloudFactory.kt.

/// Builds a `PointCloudRenderer` from the JS `renderer` prop; nil clears the layer's renderer.
func pointCloudRenderer(_ value: Any?) -> PointCloudRenderer? {
  guard let spec = value as? [String: Any],
        let attribute = spec["attributeName"] as? String else { return nil }

  let renderer: PointCloudRenderer
  switch spec["type"] as? String {
  case "rgb":
    renderer = PointCloudRGBRenderer(attributeName: attribute)

  case "class-breaks":
    let breaks = (spec["classBreaks"] as? [Any] ?? []).compactMap(colorClassBreak)
    let r = PointCloudClassBreaksRenderer(attributeName: attribute, classBreaks: breaks)
    r.transformType = transformType(spec["transformType"])
    renderer = r

  case "stretch":
    let stops = (spec["stops"] as? [Any] ?? []).compactMap(colorStop)
    let r = PointCloudStretchRenderer(attributeName: attribute, stops: stops)
    r.transformType = transformType(spec["transformType"])
    renderer = r

  case "unique-value":
    let values = (spec["uniqueValues"] as? [Any] ?? []).compactMap(colorUniqueValue)
    let r = PointCloudUniqueValueRenderer(attributeName: attribute, uniqueValues: values)
    r.transformType = transformType(spec["transformType"])
    renderer = r

  default:
    return nil
  }

  if let n = spec["pointsPerInch"] as? NSNumber { renderer.pointsPerInch = n.doubleValue }
  if let algorithm = sizeAlgorithm(spec["sizeAlgorithm"]) { renderer.sizeAlgorithm = algorithm }
  if let modulation = colorModulation(spec["colorModulation"]) {
    renderer.colorModulation = modulation
  }
  return renderer
}

/// Builds the `PointCloudFilter` list from the JS `filters` prop (an empty list clears them).
func pointCloudFilters(_ value: Any?) -> [PointCloudFilter] {
  (value as? [Any] ?? []).compactMap(pointCloudFilter)
}

private func pointCloudFilter(_ value: Any?) -> PointCloudFilter? {
  guard let spec = value as? [String: Any],
        let attribute = spec["attributeName"] as? String else { return nil }

  switch spec["type"] as? String {
  case "value":
    let values = (spec["values"] as? [NSNumber] ?? []).map(\.doubleValue)
    let mode: PointCloudValueFilter.Mode = spec["mode"] as? String == "exclude" ? .exclude : .include
    return PointCloudValueFilter(attributeName: attribute, values: values, mode: mode)

  case "return":
    let returns = (spec["includedReturns"] as? [String] ?? []).compactMap(returnType)
    return PointCloudReturnFilter(attributeName: attribute, includedReturns: returns)

  case "bitfield":
    return PointCloudBitfieldFilter(
      attributeName: attribute,
      requiredClearBits: (spec["requiredClearBits"] as? [NSNumber] ?? []).map { $0.uint32Value },
      requiredSetBits: (spec["requiredSetBits"] as? [NSNumber] ?? []).map { $0.uint32Value }
    )

  default:
    return nil
  }
}

private func colorClassBreak(_ value: Any?) -> PointCloudColorClassBreak? {
  guard let spec = value as? [String: Any],
        let color = (spec["color"] as? String).flatMap(UIColor.init(hex:)) else { return nil }
  let brk = PointCloudColorClassBreak(
    color: color,
    minValue: (spec["minValue"] as? NSNumber)?.doubleValue ?? 0,
    maxValue: (spec["maxValue"] as? NSNumber)?.doubleValue ?? 0
  )
  if let label = spec["label"] as? String { brk.label = label }
  if let description = spec["description"] as? String { brk.description = description }
  return brk
}

private func colorStop(_ value: Any?) -> PointCloudColorStop? {
  guard let spec = value as? [String: Any],
        let color = (spec["color"] as? String).flatMap(UIColor.init(hex:)) else { return nil }
  let stop = PointCloudColorStop(
    color: color,
    value: (spec["value"] as? NSNumber)?.doubleValue ?? 0
  )
  if let label = spec["label"] as? String { stop.label = label }
  return stop
}

private func colorUniqueValue(_ value: Any?) -> PointCloudColorUniqueValue? {
  guard let spec = value as? [String: Any],
        let color = (spec["color"] as? String).flatMap(UIColor.init(hex:)) else { return nil }
  let unique = PointCloudColorUniqueValue(
    color: color,
    values: spec["values"] as? [String] ?? []
  )
  if let label = spec["label"] as? String { unique.label = label }
  if let description = spec["description"] as? String { unique.description = description }
  return unique
}

private func colorModulation(_ value: Any?) -> PointCloudColorModulation? {
  guard let spec = value as? [String: Any],
        let attribute = spec["attributeName"] as? String else { return nil }
  return PointCloudColorModulation(
    attributeName: attribute,
    minValue: (spec["minValue"] as? NSNumber)?.doubleValue ?? 0,
    maxValue: (spec["maxValue"] as? NSNumber)?.doubleValue ?? 0
  )
}

private func sizeAlgorithm(_ value: Any?) -> PointCloudSizeAlgorithm? {
  guard let spec = value as? [String: Any] else { return nil }
  switch spec["type"] as? String {
  case "fixed-size":
    return PointCloudFixedSizeAlgorithm(
      size: (spec["size"] as? NSNumber)?.doubleValue ?? 1,
      sizeUnits: spec["sizeUnits"] as? String == "meters" ? .meters : .dips
    )
  case "splat":
    return PointCloudSplatAlgorithm(
      scaleFactor: (spec["scaleFactor"] as? NSNumber)?.doubleValue ?? 1
    )
  default:
    return nil
  }
}

/// Swift models "no transform" as `nil` (the enum has no `none` case, unlike Kotlin).
private func transformType(_ value: Any?) -> PointCloudRenderer.AttributeTransformType? {
  switch value as? String {
  case "absolute-value": return .absoluteValue
  case "modulo-ten": return .moduloTen
  case "high-four-bit": return .highFourBit
  case "low-four-bit": return .lowFourBit
  default: return nil
  }
}

private func returnType(_ value: String) -> PointCloudReturnFilter.ReturnType? {
  switch value {
  case "single": return .single
  case "first-of-many": return .firstOfMany
  case "last-of-many": return .lastOfMany
  case "last": return .last
  default: return nil
  }
}
