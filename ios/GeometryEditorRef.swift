import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native `GeometryEditor`. It is bound to a `<MapView>` /
/// `<SceneView>` for interactive sketching and emits `onGeometryChange` (with the current
/// geometry, or nothing when empty) as the user edits.
public final class GeometryEditorRef: SharedObject {
  let editor = GeometryEditor()
  private var observation: Task<Void, Never>?
  private var previewObservation: Task<Void, Never>?

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
    // ArcGIS 300.1: the geometry a gesture *would* produce, while it is still in flight.
    // `editor.geometry` only moves once the edit commits, so this is the live-feedback channel.
    previewObservation = Task { [weak self] in
      guard let stream = self?.editor.interactionPreviews else { return }
      for await preview in stream {
        guard let self else { break }
        var payload: [String: Any] = [:]
        if let serialized = serializeInteractionPreview(preview) { payload["preview"] = serialized }
        self.emit(event: "onInteractionPreview", payload: payload)
      }
    }
  }

  override public func sharedObjectWillRelease() {
    observation?.cancel()
    observation = nil
    previewObservation?.cancel()
    previewObservation = nil
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

  /// Selects the interaction tool: `vertex` (default), `freehand`, `reticleVertex`, or a shape
  /// tool (`arrow` / `ellipse` / `rectangle` / `triangle`).
  func setTool(_ name: String) {
    switch name {
    case "freehand": editor.tool = FreehandTool()
    case "reticleVertex": editor.tool = ReticleVertexTool()
    case "arrow": editor.tool = ShapeTool(kind: .arrow)
    case "ellipse": editor.tool = ShapeTool(kind: .ellipse)
    case "rectangle": editor.tool = ShapeTool(kind: .rectangle)
    case "triangle": editor.tool = ShapeTool(kind: .triangle)
    default: editor.tool = VertexTool()
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

/// Serializes a preview to `{ geometry, interactionType, elementKind }`; nil once the gesture ends.
private func serializeInteractionPreview(_ preview: GeometryEditorInteractionPreview?) -> [String: Any]? {
  guard let preview else { return nil }
  let interactionType: String
  switch preview.interactionType {
  case .create: interactionType = "create"
  case .move: interactionType = "move"
  case .scale: interactionType = "scale"
  default: interactionType = "rotate"
  }
  let elementKind: String
  switch preview.interactionElement {
  case is GeometryEditorVertex: elementKind = "vertex"
  case is GeometryEditorMidVertex: elementKind = "mid-vertex"
  case is GeometryEditorPart: elementKind = "part"
  default: elementKind = "geometry"
  }
  return [
    "geometry": dictFromGeometry(preview.geometry),
    "interactionType": interactionType,
    "elementKind": elementKind,
  ]
}
