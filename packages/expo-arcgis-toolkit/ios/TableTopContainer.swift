import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `TableTopSceneView` around a `<SceneView>`: the scene sits on a physical surface,
/// such as a table, that the user taps once ARKit has detected it.
final class TableTopContainer: SharedObject, SceneViewContainer {
  private let settings = TableTopSettings()

  /// Applies the JS props: `anchorPoint`, `translationFactor`, `clippingDistance`,
  /// `coachingOverlayHidden`.
  func update(_ props: [String: Any]) {
    settings.anchorPoint = arLocation(props["anchorPoint"])
    settings.translationFactor = double(props["translationFactor"]) ?? 1
    settings.clippingDistance = double(props["clippingDistance"])
    settings.coachingOverlayHidden = props["coachingOverlayHidden"] as? Bool ?? false
  }

  @MainActor func body(sceneView: @escaping (SceneViewProxy) -> SceneView) -> AnyView {
    AnyView(TableTopContent(settings: settings, sceneView: sceneView))
  }
}

final class TableTopSettings: ObservableObject {
  @Published var anchorPoint: Point?
  @Published var translationFactor = 1.0
  @Published var clippingDistance: Double?
  @Published var coachingOverlayHidden = false
}

private struct TableTopContent: View {
  @ObservedObject var settings: TableTopSettings
  let sceneView: (SceneViewProxy) -> SceneView

  var body: some View {
    if let anchorPoint = settings.anchorPoint {
      TableTopSceneView(
        anchorPoint: anchorPoint,
        translationFactor: settings.translationFactor,
        clippingDistance: settings.clippingDistance,
        sceneView: sceneView
      )
        .coachingOverlayHidden(settings.coachingOverlayHidden)
    }
  }
}
