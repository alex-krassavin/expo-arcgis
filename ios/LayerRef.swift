import ArcGIS
import ExpoModulesCore

/// Base SharedObject for an operational layer; the map reads `layer` by reference.
public class LayerRef: SharedObject {
  let layer: Layer

  init(layer: Layer) {
    self.layer = layer
    super.init()
  }

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "opacity":
        if let n = value as? NSNumber { layer.opacity = n.floatValue }
      case "visible":
        if let b = value as? Bool { layer.isVisible = b }
      default:
        break
      }
    }
  }
}

/// Operational FeatureLayer from a feature service URL or a local shapefile.
public final class FeatureLayerRef: LayerRef {
  private let table: FeatureTable

  init(props: [String: Any]) {
    let table = featureTable(from: props)
    self.table = table
    super.init(layer: FeatureLayer(featureTable: table))
  }

  /// Returns the features matching `query` (all features when nil). Loads attributes in full.
  func queryFeatures(_ query: [String: Any]?) async throws -> [[String: Any]] {
    let params = buildQueryParameters(query)
    let result: FeatureQueryResult
    if let serviceTable = table as? ServiceFeatureTable {
      result = try await serviceTable.queryFeatures(using: params, queryFeatureFields: .loadAll)
    } else {
      result = try await table.queryFeatures(using: params)
    }
    return result.features().map(serializeFeature)
  }

  func queryFeatureCount(_ query: [String: Any]?) async throws -> Int {
    try await table.queryFeatureCount(using: buildQueryParameters(query))
  }

  func queryExtent(_ query: [String: Any]?) async throws -> [String: Any] {
    dictFromGeometry(try await table.queryExtent(using: buildQueryParameters(query)))
  }

  func queryStatistics(_ query: [String: Any]) async throws -> [[String: Any]] {
    let result = try await table.queryStatistics(using: buildStatisticsQueryParameters(query))
    return result.statisticRecords().map(serializeStatisticRecord)
  }

  /// Returns the table's editing templates (name + prototype attributes), for building edit UIs.
  func queryFeatureTemplates() async throws -> [[String: Any]] {
    try await table.load()
    let templates = (table as? ArcGISFeatureTable)?.featureTemplates ?? []
    return templates.map { template in
      ["name": template.name, "prototypeAttributes": template.prototypeAttributes.mapValues { $0 as Any }]
    }
  }

  /// Adds a feature, pushes the edit to the service, and returns the new object id.
  func addFeature(_ attributes: [String: Any], _ geometry: [String: Any]?) async throws -> Int? {
    let feature = table.makeFeature()
    applyAttributes(feature, attributes)
    if let geometry = geometry.flatMap(geometryFromDict) { feature.geometry = geometry }
    try await table.add(feature)
    return try await persistEdits()
  }

  /// Updates the feature with `objectId` (changed attributes and/or geometry) and pushes the edit.
  func updateFeature(_ objectId: Int, _ changes: [String: Any]) async throws {
    guard let feature = try await featureByObjectId(objectId) else { return }
    if let attributes = changes["attributes"] as? [String: Any] { applyAttributes(feature, attributes) }
    if let geometry = (changes["geometry"] as? [String: Any]).flatMap(geometryFromDict) { feature.geometry = geometry }
    try await table.update(feature)
    _ = try await persistEdits()
  }

  /// Deletes the feature with `objectId` and pushes the edit.
  func deleteFeature(_ objectId: Int) async throws {
    guard let feature = try await featureByObjectId(objectId) else { return }
    try await table.delete(feature)
    _ = try await persistEdits()
  }

  private func featureByObjectId(_ objectId: Int) async throws -> Feature? {
    let params = QueryParameters()
    params.addObjectIDs([objectId])
    return Array(try await table.queryFeatures(using: params).features()).first
  }

  /// Pushes pending local edits to the feature service (no-op for non-service tables).
  private func persistEdits() async throws -> Int? {
    guard let serviceTable = table as? ServiceFeatureTable else { return nil }
    return try await serviceTable.applyEdits().first?.objectID
  }

  override func applyProps(_ changed: [String: Any]) {
    super.applyProps(changed)
    guard let featureLayer = layer as? FeatureLayer else { return }
    if changed.keys.contains("renderer") {
      featureLayer.renderer = (changed["renderer"] as? [String: Any]).flatMap(buildRenderer)
    }
    if let labelsEnabled = changed["labelsEnabled"] as? Bool {
      featureLayer.labelsAreEnabled = labelsEnabled
    }
    if changed.keys.contains("labels") {
      featureLayer.removeAllLabelDefinitions()
      for case let labelDict as [String: Any] in (changed["labels"] as? [Any] ?? []) {
        featureLayer.addLabelDefinition(buildLabelDefinition(labelDict))
      }
    }
    if changed.keys.contains("featureReduction") {
      featureLayer.featureReduction = (changed["featureReduction"] as? [String: Any]).flatMap(buildFeatureReduction)
    }
  }
}

/// Builds a `FeatureTable` from a JS source: `{ type:"shapefile", path }` or a service URL
/// (via `source: { type:"service", url }` or the `url` shorthand).
func featureTable(from props: [String: Any]) -> FeatureTable {
  if let source = props["source"] as? [String: Any] {
    if (source["type"] as? String) == "shapefile", let path = source["path"] as? String {
      return ShapefileFeatureTable(fileURL: URL(fileURLWithPath: path))
    }
    if let url = source["url"] as? String {
      return ServiceFeatureTable(url: URL(string: url)!)
    }
  }
  return ServiceFeatureTable(url: URL(string: props["url"] as? String ?? "")!)
}

/// Operational tiled layer backed by a tiled map service URL.
public final class TiledLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISTiledLayer(url: URL(string: url)!))
  }
}

/// Operational map image layer backed by a dynamic map service URL.
public final class MapImageLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISMapImageLayer(url: URL(string: url)!))
  }
}

/// Operational 3D scene layer (3D objects / integrated mesh) backed by a scene service URL.
public final class SceneLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISSceneLayer(url: URL(string: url)!))
  }
}

/// Operational vector tiled layer backed by a vector tile service URL.
public final class VectorTiledLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: ArcGISVectorTiledLayer(url: URL(string: url)!))
  }
}

/// Operational 3D integrated mesh layer backed by a scene service URL.
public final class IntegratedMeshLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: IntegratedMeshLayer(url: URL(string: url)!))
  }
}

/// Operational 3D point cloud layer backed by a scene service URL.
public final class PointCloudLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: PointCloudLayer(url: URL(string: url)!))
  }
}

/// Operational OGC 3D Tiles layer backed by a 3D Tiles service URL.
public final class Ogc3DTilesLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: OGC3DTilesLayer(url: URL(string: url)!))
  }
}

/// Operational web tiled layer backed by a `{level}/{row}/{col}` URL template.
public final class WebTiledLayerRef: LayerRef {
  init(urlTemplate: String) {
    super.init(layer: WebTiledLayer(urlTemplate: urlTemplate))
  }
}

/// Operational OpenStreetMap tiled layer.
public final class OpenStreetMapLayerRef: LayerRef {
  init() {
    super.init(layer: OpenStreetMapLayer())
  }
}

/// Operational WMS layer (Web Map Service) backed by a service URL + visible layer names.
public final class WmsLayerRef: LayerRef {
  init(url: String, layerNames: [String]) {
    super.init(layer: WMSLayer(url: URL(string: url)!, layerNames: layerNames))
  }
}

/// Operational WMTS layer (Web Map Tile Service) backed by a service URL + layer id.
public final class WmtsLayerRef: LayerRef {
  init(url: String, layerID: String) {
    super.init(layer: WMTSLayer(url: URL(string: url)!, layerID: layerID))
  }
}

/// Operational raster layer from a remote image service or a local raster file.
public final class RasterLayerRef: LayerRef {
  init(source: [String: Any]) {
    super.init(layer: RasterLayer(raster: rasterFromSource(source)))
  }
}

/// Builds a `Raster` from a JS source dict: `{ type: "imageService", url }` or `{ type: "file", path }`.
func rasterFromSource(_ s: [String: Any]) -> Raster {
  if (s["type"] as? String) == "file", let path = s["path"] as? String {
    return Raster(fileURL: URL(fileURLWithPath: path))
  }
  return ImageServiceRaster(url: URL(string: s["url"] as? String ?? "")!)
}

/// Operational KML layer from a remote `.kml`/`.kmz` URL or local file.
public final class KmlLayerRef: LayerRef {
  init(url: String) {
    super.init(layer: KMLLayer(dataset: KMLDataset(url: URL(string: url)!)))
  }
}

/// Operational WFS layer — a `FeatureLayer` over a `WFSFeatureTable` (Web Feature Service).
public final class WfsLayerRef: LayerRef {
  init(url: String, tableName: String) {
    let table = WFSFeatureTable(url: URL(string: url)!, tableName: tableName)
    table.featureRequestMode = .onInteractionCache
    super.init(layer: FeatureLayer(featureTable: table))
  }
}

/// Operational OGC API - Features layer — a `FeatureLayer` over an `OGCFeatureCollectionTable`.
public final class OgcFeatureLayerRef: LayerRef {
  init(url: String, collectionID: String) {
    let table = OGCFeatureCollectionTable(url: URL(string: url)!, collectionID: collectionID)
    table.featureRequestMode = .onInteractionCache
    super.init(layer: FeatureLayer(featureTable: table))
  }
}
