import ArcGIS
import ExpoModulesCore

/// A local mobile geodatabase (`.geodatabase` file) with transactional editing. Opened via
/// `offline.openGeodatabase(path)`. Wrap a batch of edits in `beginTransaction` / `commitTransaction`
/// (persist) or `rollbackTransaction` (discard). Edits target a table by name.
public final class GeodatabaseRef: SharedObject {
  private let geodatabase: Geodatabase

  init(geodatabase: Geodatabase) {
    self.geodatabase = geodatabase
    super.init()
  }

  // Swift's geodatabase transaction calls are synchronous (Kotlin's are suspend); the methods stay
  // `async` so Expo can register them uniformly as `AsyncFunction`s.
  func beginTransaction() async throws { try geodatabase.beginTransaction() }
  func commitTransaction() async throws { try geodatabase.commitTransaction() }
  func rollbackTransaction() async throws { try geodatabase.rollbackTransaction() }
  func isInTransaction() -> Bool { geodatabase.isInTransaction }

  /// The names of the geodatabase's feature tables.
  func getFeatureTableNames() -> [String] { geodatabase.featureTables.map { $0.tableName } }

  /// Counts features in `tableName` matching `whereClause` (all when nil).
  func queryFeatureCount(_ tableName: String, _ whereClause: String?) async throws -> Int {
    guard let table = table(named: tableName) else { return 0 }
    let params = QueryParameters()
    params.whereClause = whereClause ?? "1=1"
    return try await table.queryFeatureCount(using: params)
  }

  /// Adds a feature (attributes + optional geometry) to `tableName`. Local until the transaction
  /// is committed.
  func addFeature(_ tableName: String, _ attributes: [String: Any], _ geometry: [String: Any]?) async throws {
    guard let table = table(named: tableName) else {
      throw NSError(domain: "ExpoArcgis", code: 6, userInfo: [NSLocalizedDescriptionKey: "No feature table named \(tableName)"])
    }
    let feature = table.makeFeature()
    applyAttributes(feature, attributes)
    if let geometry = geometry.flatMap(geometryFromDict) { feature.geometry = geometry }
    try await table.add(feature)
  }

  private func table(named name: String) -> GeodatabaseFeatureTable? {
    geodatabase.featureTables.first { $0.tableName == name }
  }
}

/// Opens a local mobile geodatabase file and loads it.
func openGeodatabase(_ path: String) async throws -> GeodatabaseRef {
  let geodatabase = Geodatabase(fileURL: URL(fileURLWithPath: path))
  try await geodatabase.load()
  return GeodatabaseRef(geodatabase: geodatabase)
}
