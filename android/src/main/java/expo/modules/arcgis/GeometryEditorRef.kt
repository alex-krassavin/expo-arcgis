package expo.modules.arcgis

import com.arcgismaps.geometry.GeometryType
import com.arcgismaps.mapping.view.geometryeditor.FreehandTool
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditor
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditorInteractionPreview
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditorInteractionType
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditorMidVertex
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditorPart
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditorVertex
import com.arcgismaps.mapping.view.geometryeditor.ReticleVertexTool
import com.arcgismaps.mapping.view.geometryeditor.ShapeTool
import com.arcgismaps.mapping.view.geometryeditor.ShapeToolType
import com.arcgismaps.mapping.view.geometryeditor.VertexTool
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * SharedObject wrapping a native [GeometryEditor]. It is bound to a `<MapView>` / `<SceneView>`
 * for interactive sketching and emits `onGeometryChange` (with the current geometry, or nothing
 * when empty) as the user edits.
 */
class GeometryEditorRef(appContext: AppContext) : SharedObject(appContext) {
  val editor = GeometryEditor()
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  init {
    scope.launch {
      editor.geometry.collect { geometry ->
        emit("onGeometryChange", geometry?.let { mapOf("geometry" to dictFromGeometry(it)) } ?: emptyMap<String, Any?>())
      }
    }
    // ArcGIS 300.1: the geometry a gesture *would* produce, while it is still in flight.
    // `editor.geometry` only moves once the edit commits, so this is the live-feedback channel.
    scope.launch {
      editor.interactionPreviewChanged.collect { event ->
        emit("onInteractionPreview", mapOf("preview" to serializeInteractionPreview(event.interactionPreview)))
      }
    }
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
  }

  /** Serializes a preview to `{ geometry, interactionType, elementKind }`; null once the gesture ends. */
  private fun serializeInteractionPreview(preview: GeometryEditorInteractionPreview?): Map<String, Any?>? {
    preview ?: return null
    return mapOf(
      "geometry" to dictFromGeometry(preview.previewGeometry),
      "interactionType" to when (preview.interactionType) {
        GeometryEditorInteractionType.Create -> "create"
        GeometryEditorInteractionType.Move -> "move"
        GeometryEditorInteractionType.Scale -> "scale"
        else -> "rotate"
      },
      "elementKind" to when (preview.interactionElement) {
        is GeometryEditorVertex -> "vertex"
        is GeometryEditorMidVertex -> "mid-vertex"
        is GeometryEditorPart -> "part"
        else -> "geometry"
      },
    )
  }

  /** Starts editing a new geometry of the given type. */
  fun start(type: String) {
    val geometryType = when (type) {
      "point" -> GeometryType.Point
      "multipoint" -> GeometryType.Multipoint
      "polyline" -> GeometryType.Polyline
      "polygon" -> GeometryType.Polygon
      "envelope" -> GeometryType.Envelope
      else -> return
    }
    editor.start(geometryType)
  }

  /**
   * Selects the interaction tool: `vertex` (default), `freehand`, `reticleVertex`, or a shape tool
   * (`arrow` / `ellipse` / `rectangle` / `triangle`).
   */
  fun setTool(name: String) {
    editor.tool = when (name) {
      "freehand" -> FreehandTool()
      "reticleVertex" -> ReticleVertexTool()
      "arrow" -> ShapeTool(ShapeToolType.Arrow)
      "ellipse" -> ShapeTool(ShapeToolType.Ellipse)
      "rectangle" -> ShapeTool(ShapeToolType.Rectangle)
      "triangle" -> ShapeTool(ShapeToolType.Triangle)
      else -> VertexTool()
    }
  }

  /** Stops editing and returns the final geometry (or null if nothing was drawn). */
  fun stop(): Map<String, Any?>? = editor.stop()?.let { dictFromGeometry(it) }

  fun clearGeometry() = editor.clearGeometry()
  fun undo() = editor.undo()
  fun redo() = editor.redo()
  fun deleteSelectedElement() = editor.deleteSelectedElement()
}
