package expo.modules.arcgis

import com.arcgismaps.geometry.GeometryType
import com.arcgismaps.mapping.view.geometryeditor.GeometryEditor
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
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
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

  /** Stops editing and returns the final geometry (or null if nothing was drawn). */
  fun stop(): Map<String, Any?>? = editor.stop()?.let { dictFromGeometry(it) }

  fun clearGeometry() = editor.clearGeometry()
  fun undo() = editor.undo()
  fun redo() = editor.redo()
  fun deleteSelectedElement() = editor.deleteSelectedElement()
}
