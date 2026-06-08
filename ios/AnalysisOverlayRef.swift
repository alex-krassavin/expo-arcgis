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

/// SharedObject wrapping an `ExploratoryLocationLineOfSight` — observer→target visibility.
/// Streams the target's visibility back to JS via `onTargetVisibilityChange`.
public final class LineOfSightRef: AnalysisRef {
  private let lineOfSight: ExploratoryLocationLineOfSight
  private var observation: Task<Void, Never>?

  init(props: [String: Any]) {
    let observer = (props["observer"] as? [String: Any]).flatMap(geometryFromDict) as? Point
      ?? Point(x: 0, y: 0, spatialReference: .wgs84)
    let target = (props["target"] as? [String: Any]).flatMap(geometryFromDict) as? Point
      ?? Point(x: 0, y: 0, spatialReference: .wgs84)
    let lineOfSight = ExploratoryLocationLineOfSight(observerLocation: observer, targetLocation: target)
    self.lineOfSight = lineOfSight
    super.init(analysis: lineOfSight)
    observation = Task { [weak self] in
      guard let stream = self?.lineOfSight.$targetVisibility else { return }
      for await visibility in stream {
        guard let self else { break }
        self.emit(event: "onTargetVisibilityChange", payload: ["visibility": visibilityString(visibility)])
      }
    }
  }

  override public func sharedObjectWillRelease() {
    observation?.cancel()
    observation = nil
    super.sharedObjectWillRelease()
  }

  func applyProps(_ changed: [String: Any]) {
    for (key, value) in changed {
      switch key {
      case "observer":
        if let point = (value as? [String: Any]).flatMap(geometryFromDict) as? Point {
          lineOfSight.observerLocation = point
        }
      case "target":
        if let point = (value as? [String: Any]).flatMap(geometryFromDict) as? Point {
          lineOfSight.targetLocation = point
        }
      default:
        break
      }
    }
  }
}

/// Maps the native line-of-sight visibility enum to the JS `TargetVisibility` union.
private func visibilityString(_ v: ExploratoryLineOfSight.TargetVisibility) -> String {
  switch v {
  case .visible: return "visible"
  case .obstructed: return "obstructed"
  case .unknown: return "unknown"
  @unknown default: return "unknown"
  }
}
