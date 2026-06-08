import ArcGIS
import ExpoModulesCore

/// SharedObject wrapping a native `AnalysisOverlay` owned by a SceneView. Holds visual analyses
/// (`<Viewshed>` / `<LineOfSight>`) declared as children of `<AnalysisOverlay>`.
public class AnalysisOverlayRef: SharedObject {
  let overlay = AnalysisOverlay()

  func addAnalysis(_ ref: AnalysisRef) {
    overlay.addAnalysis(ref.analysis)
  }

  func removeAnalysis(_ ref: AnalysisRef) {
    overlay.removeAnalysis(ref.analysis)
  }

  func setVisible(_ visible: Bool) {
    overlay.isVisible = visible
  }
}

/// Base SharedObject wrapping an exploratory `Analysis` (viewshed / line-of-sight); the overlay
/// reads `analysis` by reference. Subclasses build and own the concrete analysis.
public class AnalysisRef: SharedObject {
  let analysis: Analysis

  init(analysis: Analysis) {
    self.analysis = analysis
    super.init()
  }
}

/// SharedObject wrapping an `ExploratoryLocationViewshed` — the area visible from an observer.
public final class ViewshedRef: AnalysisRef {
  private let viewshed: ExploratoryLocationViewshed

  init(props: [String: Any]) {
    let location = (props["location"] as? [String: Any]).flatMap(geometryFromDict) as? Point
      ?? Point(x: 0, y: 0, spatialReference: .wgs84)
    let viewshed = ExploratoryLocationViewshed(
      location: location,
      heading: (props["heading"] as? NSNumber)?.doubleValue ?? 0,
      pitch: (props["pitch"] as? NSNumber)?.doubleValue ?? 90,
      horizontalAngle: (props["horizontalAngle"] as? NSNumber)?.doubleValue ?? 45,
      verticalAngle: (props["verticalAngle"] as? NSNumber)?.doubleValue ?? 45,
      minDistance: (props["minDistance"] as? NSNumber)?.doubleValue,
      maxDistance: (props["maxDistance"] as? NSNumber)?.doubleValue
    )
    self.viewshed = viewshed
    super.init(analysis: viewshed)
    applyProps(props)
  }

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "location":
        if let point = (value as? [String: Any]).flatMap(geometryFromDict) as? Point {
          viewshed.location = point
        }
      case "heading":
        if let n = value as? NSNumber { viewshed.heading = n.doubleValue }
      case "pitch":
        if let n = value as? NSNumber { viewshed.pitch = n.doubleValue }
      case "horizontalAngle":
        if let n = value as? NSNumber { viewshed.horizontalAngle = n.doubleValue }
      case "verticalAngle":
        if let n = value as? NSNumber { viewshed.verticalAngle = n.doubleValue }
      case "minDistance":
        viewshed.minDistance = (value as? NSNumber)?.doubleValue
      case "maxDistance":
        viewshed.maxDistance = (value as? NSNumber)?.doubleValue
      case "frustumOutlineVisible":
        if let b = value as? Bool { viewshed.frustumOutlineIsVisible = b }
      default:
        break
      }
    }
  }
}
