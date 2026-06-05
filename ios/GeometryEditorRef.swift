import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native `GeometryEditor`. It is bound to a `<MapView>` /
/// `<SceneView>` for interactive sketching and emits `onGeometryChange` (with the current
/// geometry, or nothing when empty) as the user edits.
public final class GeometryEditorRef: SharedObject {
  let editor = GeometryEditor()
  private var observation: Task<Void, Never>?

  override public init() {
    super.init()
    observation = Task { [weak self] in
      guard let stream = self?.editor.$geometry else { return }
      for await geometry in stream {
        guard let self else { break }
        var payload: [String: Any] = [:]
        if let geometry { payload["geometry"] = dictFromGeometry(geometry) }
        self.emit(event: "onGeometryChange", payload: payload)
      }
    }
  }

  override public func sharedObjectWillRelease() {
    observation?.cancel()
    observation = nil
    super.sharedObjectWillRelease()
  }

  /// Starts editing a new geometry of the given type (`point` / `multipoint` / `polyline` /
  /// `polygon` / `envelope`).
  func start(_ type: String) {
    switch type {
    case "point": editor.start(withType: Point.self)
    case "multipoint": editor.start(withType: Multipoint.self)
    case "polyline": editor.start(withType: Polyline.self)
    case "polygon": editor.start(withType: Polygon.self)
    case "envelope": editor.start(withType: Envelope.self)
    default: break
    }
  }

  /// Stops editing and returns the final geometry (or nil if nothing was drawn).
  func stop() -> [String: Any]? {
    editor.stop().map(dictFromGeometry)
  }

  func clearGeometry() { editor.clearGeometry() }
  func undo() { editor.undo() }
  func redo() { editor.redo() }
  func deleteSelectedElement() { editor.deleteSelectedElement() }
}
