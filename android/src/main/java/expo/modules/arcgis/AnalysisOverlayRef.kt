package expo.modules.arcgis

import com.arcgismaps.analysis.interactive.Analysis
import com.arcgismaps.analysis.interactive.ExploratoryLocationViewshed
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.view.AnalysisOverlay
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * SharedObject wrapping a native [AnalysisOverlay] owned by a SceneView. Holds the visual analyses
 * (`<Viewshed>` / `<LineOfSight>`) declared as children of `<AnalysisOverlay>`.
 */
class AnalysisOverlayRef(appContext: AppContext) : SharedObject(appContext) {
  val overlay = AnalysisOverlay(emptyList())

  fun addAnalysis(ref: AnalysisRef) {
    overlay.analyses.add(ref.analysis)
  }

  fun removeAnalysis(ref: AnalysisRef) {
    overlay.analyses.remove(ref.analysis)
  }

  fun setVisible(visible: Boolean) {
    overlay.isVisible = visible
  }
}

/** Base SharedObject wrapping an exploratory [Analysis] (viewshed / line-of-sight). */
abstract class AnalysisRef(appContext: AppContext) : SharedObject(appContext) {
  abstract val analysis: Analysis
}

/** SharedObject wrapping an [ExploratoryLocationViewshed] — the area visible from an observer. */
class ViewshedRef(appContext: AppContext, props: Map<String, Any?>) : AnalysisRef(appContext) {
  private val viewshed = ExploratoryLocationViewshed(
    analysisPoint(props["location"]) ?: Point(0.0, 0.0, SpatialReference.wgs84()),
    numOr(props["heading"], 0.0),
    numOr(props["pitch"], 90.0),
    numOr(props["horizontalAngle"], 45.0),
    numOr(props["verticalAngle"], 45.0),
    (props["minDistance"] as? Number)?.toDouble(),
    (props["maxDistance"] as? Number)?.toDouble(),
  )

  override val analysis: Analysis get() = viewshed

  init {
    applyProps(props)
  }

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "location" -> analysisPoint(value)?.let { viewshed.location = it }
        "heading" -> (value as? Number)?.toDouble()?.let { viewshed.heading = it }
        "pitch" -> (value as? Number)?.toDouble()?.let { viewshed.pitch = it }
        "horizontalAngle" -> (value as? Number)?.toDouble()?.let { viewshed.horizontalAngle = it }
        "verticalAngle" -> (value as? Number)?.toDouble()?.let { viewshed.verticalAngle = it }
        "minDistance" -> viewshed.minDistance = (value as? Number)?.toDouble()
        "maxDistance" -> viewshed.maxDistance = (value as? Number)?.toDouble()
        "frustumOutlineVisible" -> (value as? Boolean)?.let { viewshed.frustumOutlineVisible = it }
      }
    }
  }
}

/** Decodes a JS point dict into a [Point] (returns null if the value is not a point geometry). */
internal fun analysisPoint(value: Any?): Point? =
  (value as? Map<*, *>)?.let { geometryFromDict(it) } as? Point

private fun numOr(value: Any?, default: Double): Double = (value as? Number)?.toDouble() ?: default
