import ArcGIS
import ExpoModulesCore

/// Operational `DynamicEntityLayer` backed by a real-time data source (a stream service — moving
/// entities that update live). Emits `onConnectionStatusChange` as the data source connects.
public final class DynamicEntityLayerRef: LayerRef {
  let dataSource: DynamicEntityDataSource
  private let pushFeed: PushFeed?
  private var statusTask: Task<Void, Never>?

  init(props: [String: Any]) {
    let source: DynamicEntityDataSource
    if let custom = props["customSource"] as? [String: Any] {
      let feed = PushFeed()
      let info = DynamicEntityDataSourceInfo(
        entityIDFieldName: custom["entityIdField"] as? String ?? "id",
        fields: buildDynamicEntityFields(custom["fields"] as? [[String: Any]] ?? [])
      )
      self.pushFeed = feed
      source = CustomDynamicEntityDataSource(info: info) { feed }
    } else {
      let urlString = props["streamServiceUrl"] as? String ?? "https://example.invalid"
      self.pushFeed = nil
      source = ArcGISStreamService(url: URL(string: urlString) ?? URL(string: "https://example.invalid")!)
    }
    self.dataSource = source
    super.init(layer: DynamicEntityLayer(dataSource: source))
    observeConnectionStatus()
  }

  /// Pushes an observation into a custom data source (no-op for a stream service).
  func pushObservation(_ attributes: [String: Any], _ geometry: [String: Any]) {
    pushFeed?.push(
      geometry: geometryFromDict(geometry),
      attributes: attributes.mapValues(sendableAttribute)
    )
  }

  private func observeConnectionStatus() {
    statusTask = Task { [weak self] in
      guard let self else { return }
      for await status in self.dataSource.$connectionStatus {
        self.emit(event: "onConnectionStatusChange", payload: ["status": connectionStatusString(status)])
      }
    }
  }

  /// Returns the data source's currently-tracked dynamic entities (attributes + geometry).
  func queryDynamicEntities() async throws -> [String: Any] {
    let result = try await dataSource.queryDynamicEntities(using: DynamicEntityQueryParameters())
    let entities = Array(result.entities())
    let serialized = entities.map { entity -> [String: Any] in
      var dict: [String: Any] = ["attributes": entity.attributes.mapValues { $0 as Any }]
      if let geometry = entity.geometry { dict["geometry"] = dictFromGeometry(geometry) }
      return dict
    }
    return ["count": entities.count, "entities": serialized]
  }

  override func applyProps(_ changed: [String: Any]) {
    super.applyProps(changed)
    guard let layer = layer as? DynamicEntityLayer else { return }
    if let track = changed["trackDisplay"] as? [String: Any] {
      if let maxObs = track["maximumObservations"] as? NSNumber {
        layer.trackDisplayProperties.maximumObservations = maxObs.intValue
      }
      if let showsPrev = track["showsPreviousObservations"] as? Bool {
        layer.trackDisplayProperties.showsPreviousObservations = showsPrev
      }
    }
  }

  override public func sharedObjectWillRelease() {
    statusTask?.cancel()
    super.sharedObjectWillRelease()
  }
}

/// Maps `ConnectionStatus` to the JS string union.
func connectionStatusString(_ status: ConnectionStatus) -> String {
  switch status {
  case .disconnected: return "disconnected"
  case .connecting: return "connecting"
  case .connected: return "connected"
  case .failed: return "failed"
  @unknown default: return "disconnected"
  }
}

/// A `CustomDynamicEntityFeed` driven imperatively — `push` yields a `newObservation` event.
final class PushFeed: CustomDynamicEntityFeed, @unchecked Sendable {
  typealias Events = AsyncStream<CustomDynamicEntityFeedEvent>
  let events: AsyncStream<CustomDynamicEntityFeedEvent>
  private let continuation: AsyncStream<CustomDynamicEntityFeedEvent>.Continuation

  init() {
    var cont: AsyncStream<CustomDynamicEntityFeedEvent>.Continuation!
    self.events = AsyncStream { cont = $0 }
    self.continuation = cont
  }

  func push(geometry: Geometry?, attributes: [String: any Sendable]) {
    continuation.yield(.newObservation(geometry: geometry, attributes: attributes))
  }
}

/// Converts a JS attribute value to a `Sendable` one (`Sendable` is a marker — it can't be cast at runtime).
private func sendableAttribute(_ value: Any) -> any Sendable {
  if let string = value as? String { return string }
  if let number = value as? NSNumber { return number.doubleValue }
  return String(describing: value)
}

/// Builds `Field`s from JS `{ name, type }` defs for a custom data source (`ArcGIS.Field` — Expo also
/// exposes a `Field` property wrapper, so the namespace is required).
func buildDynamicEntityFields(_ defs: [[String: Any]]) -> [ArcGIS.Field] {
  defs.map { def in
    ArcGIS.Field(type: dynamicEntityFieldType(def["type"] as? String), name: def["name"] as? String ?? "", alias: "")
  }
}

private func dynamicEntityFieldType(_ type: String?) -> FieldType {
  switch type {
  case "int32": return .int32
  case "int64": return .int64
  case "float64": return .float64
  case "date": return .date
  default: return .text
  }
}
