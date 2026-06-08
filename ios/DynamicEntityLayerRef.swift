import ArcGIS
import ExpoModulesCore

/// Operational `DynamicEntityLayer` backed by a real-time data source (a stream service — moving
/// entities that update live). Emits `onConnectionStatusChange` as the data source connects.
public final class DynamicEntityLayerRef: LayerRef {
  let dataSource: DynamicEntityDataSource
  private var statusTask: Task<Void, Never>?

  init(props: [String: Any]) {
    let urlString = props["streamServiceUrl"] as? String ?? "https://example.invalid"
    let source = ArcGISStreamService(url: URL(string: urlString) ?? URL(string: "https://example.invalid")!)
    self.dataSource = source
    super.init(layer: DynamicEntityLayer(dataSource: source))
    observeConnectionStatus()
  }

  private func observeConnectionStatus() {
    statusTask = Task { [weak self] in
      guard let self else { return }
      for await status in self.dataSource.$connectionStatus {
        self.emit(event: "onConnectionStatusChange", payload: ["status": connectionStatusString(status)])
      }
    }
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
