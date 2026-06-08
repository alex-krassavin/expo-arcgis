package expo.modules.arcgis

import com.arcgismaps.analysis.interactive.Analysis
import com.arcgismaps.analysis.interactive.ExploratoryLineOfSightTargetVisibility
import com.arcgismaps.analysis.interactive.ExploratoryLocationDistanceMeasurement
import com.arcgismaps.analysis.interactive.ExploratoryLocationLineOfSight
import com.arcgismaps.analysis.interactive.ExploratoryLocationViewshed
import com.arcgismaps.geometry.Point
import com.arcgismaps.geometry.SpatialReference
import com.arcgismaps.mapping.view.AnalysisOverlay
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

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

/** SharedObject wrapping an [ExploratoryLocationLineOfSight] — streams target visibility to JS. */
class LineOfSightRef(appContext: AppContext, props: Map<String, Any?>) : AnalysisRef(appContext) {
  private val lineOfSight = ExploratoryLocationLineOfSight(
    analysisPoint(props["observer"]) ?: Point(0.0, 0.0, SpatialReference.wgs84()),
    analysisPoint(props["target"]) ?: Point(0.0, 0.0, SpatialReference.wgs84()),
  )
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  override val analysis: Analysis get() = lineOfSight

  init {
    scope.launch {
      lineOfSight.targetVisibility.collect { visibility ->
        emit("onTargetVisibilityChange", mapOf("visibility" to visibilityString(visibility)))
      }
    }
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
  }

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "observer" -> analysisPoint(value)?.let { lineOfSight.observerLocation = it }
        "target" -> analysisPoint(value)?.let { lineOfSight.targetLocation = it }
      }
    }
  }
}

/**
 * SharedObject wrapping an [ExploratoryLocationDistanceMeasurement] — direct/horizontal/vertical
 * distance between two 3D points. Streams the measurements to JS via `onMeasurementChange`.
 */
class DistanceMeasurementRef(appContext: AppContext, props: Map<String, Any?>) : AnalysisRef(appContext) {
  private val measurement = ExploratoryLocationDistanceMeasurement(
    analysisPoint(props["startLocation"]) ?: Point(0.0, 0.0, SpatialReference.wgs84()),
    analysisPoint(props["endLocation"]) ?: Point(0.0, 0.0, SpatialReference.wgs84()),
  )
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  override val analysis: Analysis get() = measurement

  init {
    scope.launch {
      measurement.measurementChanged.collect { m ->
        emit(
          "onMeasurementChange",
          mapOf(
            "directDistance" to m.directDistance.value,
            "horizontalDistance" to m.horizontalDistance.value,
            "verticalDistance" to m.verticalDistance.value,
          ),
        )
      }
    }
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
  }

  fun applyProps(changed: Map<String, Any?>) {
    changed.forEach { (key, value) ->
      when (key) {
        "startLocation" -> analysisPoint(value)?.let { measurement.startLocation = it }
        "endLocation" -> analysisPoint(value)?.let { measurement.endLocation = it }
      }
    }
  }
}

/** Decodes a JS point dict into a [Point] (returns null if the value is not a point geometry). */
internal fun analysisPoint(value: Any?): Point? =
  (value as? Map<*, *>)?.let { geometryFromDict(it) } as? Point

private fun numOr(value: Any?, default: Double): Double = (value as? Number)?.toDouble() ?: default

/** Maps the native line-of-sight visibility to the JS `TargetVisibility` union. */
private fun visibilityString(v: ExploratoryLineOfSightTargetVisibility): String = when (v) {
  is ExploratoryLineOfSightTargetVisibility.Visible -> "visible"
  is ExploratoryLineOfSightTargetVisibility.Obstructed -> "obstructed"
  else -> "unknown"
}
