import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `FlyoverSceneView` around a `<SceneView>`: as the device moves, the camera flies
/// over the scene from its initial location. It tracks the device's position with ARKit, without
/// showing the camera feed.
final class FlyoverContainer: SharedObject, SceneViewContainer {
  private let settings = FlyoverSettings()

  /// Applies the JS props: `initialLocation`, `initialHeading`, `translationFactor`.
  func update(_ props: [String: Any]) {
    settings.initialLocation = arLocation(props["initialLocation"])
    settings.initialHeading = double(props["initialHeading"])
    settings.translationFactor = double(props["translationFactor"]) ?? 1
  }

  @MainActor func body(sceneView: @escaping (SceneViewProxy) -> SceneView) -> AnyView {
    AnyView(FlyoverContent(settings: settings, sceneView: sceneView))
  }
}

final class FlyoverSettings: ObservableObject {
  @Published var initialLocation: Point?
  @Published var initialHeading: Double?
  @Published var translationFactor = 1.0
}

private struct FlyoverContent: View {
  @ObservedObject var settings: FlyoverSettings
  let sceneView: (SceneViewProxy) -> SceneView

  var body: some View {
    if let initialLocation = settings.initialLocation {
      // A nil heading orients the scene to the device's compass heading.
      FlyoverSceneView(
        initialLocation: initialLocation,
        translationFactor: settings.translationFactor,
        initialHeading: settings.initialHeading,
        sceneView: sceneView
      )
    }
  }
}
