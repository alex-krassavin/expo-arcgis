import ArcGIS
import ExpoModulesCore

/// Branch-versioning handle over a `ServiceGeodatabase`. Built by `FeatureLayerRef.getServiceGeodatabase()`
/// (never constructed from JS). Manages named branch versions and pushes the service-wide local edits
/// (across every connected table) to the active version.
public final class ServiceGeodatabaseRef: SharedObject {
  private let geodatabase: ServiceGeodatabase

  init(geodatabase: ServiceGeodatabase) {
    self.geodatabase = geodatabase
    super.init()
  }

  /// Lists every branch version defined on the service.
  func fetchVersions() async throws -> [[String: Any]] {
    try await geodatabase.versions.map(serializeVersionInfo)
  }

  /// Creates a new branch version from `{ name, description?, access? }` and returns its info.
  func createVersion(_ params: [String: Any]) async throws -> [String: Any] {
    let parameters = ServiceVersionParameters()
    if let name = params["name"] as? String { parameters.name = name }
    if let description = params["description"] as? String { parameters.description = description }
    parameters.access = versionAccess(from: params["access"] as? String)
    return serializeVersionInfo(try await geodatabase.makeVersion(parameters: parameters))
  }

  /// Switches the active version (requires no outstanding local edits).
  func switchVersion(_ name: String) async throws {
    try await geodatabase.switchToVersion(named: name)
  }

  /// Pushes all connected tables' local edits to the active version; returns each edit's result.
  func applyEdits() async throws -> [[String: Any]] {
    try await geodatabase.applyEdits().flatMap { $0.editResults }.map {
      ["objectId": $0.objectID, "completedWithErrors": $0.didCompleteWithErrors]
    }
  }

  /// Discards all local edits across the connected tables.
  func undoLocalEdits() async throws {
    try await geodatabase.undoLocalEdits()
  }

  func hasLocalEdits() -> Bool { geodatabase.hasLocalEdits }
  func getVersionName() -> String { geodatabase.versionName }
  func getDefaultVersionName() -> String { geodatabase.defaultVersionName }
  func supportsBranchVersioning() -> Bool { geodatabase.supportsBranchVersioning }
}

/// Serializes a `ServiceVersionInfo` to a JS-friendly dict.
private func serializeVersionInfo(_ info: ServiceVersionInfo) -> [String: Any] {
  var dict: [String: Any] = [
    "name": info.name,
    "description": info.description,
    "access": accessString(info.access),
    "isOwner": info.isOwner,
  ]
  if let versionID = info.versionID { dict["versionId"] = versionID.uuidString }
  return dict
}

/// Native `VersionAccess` → JS string.
private func accessString(_ access: VersionAccess) -> String {
  switch access {
  case .public: return "public"
  case .protected: return "protected"
  case .private: return "private"
  @unknown default: return "public"
  }
}

/// JS string → native `VersionAccess` (defaults to `.public`).
private func versionAccess(from string: String?) -> VersionAccess {
  switch string {
  case "protected": return .protected
  case "private": return .private
  default: return .public
  }
}
