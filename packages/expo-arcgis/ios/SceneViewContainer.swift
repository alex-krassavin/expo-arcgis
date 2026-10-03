import ArcGIS
import SwiftUI

/// Shows a `<SceneView>`'s scene in a view of a package built on expo-arcgis, in place of the
/// plain `SceneView`: expo-arcgis-toolkit's augmented reality views. The Swift Toolkit's
/// `TableTopSceneView`, `FlyoverSceneView` and `WorldScaleSceneView` each take a closure that
/// builds a `SceneView`, and the container hands them the one the core builds.
///
/// The `<SceneView>` receives the container (a shared object) as its `container` prop. The core
/// still loads the scene and reports the view's events; the container decides how the SceneView
/// shows, and controls the camera. A view with a container shows no accessories.
public protocol SceneViewContainer: AnyObject {
  /// The view that shows the scene. `sceneView` builds the `SceneView` the core would show (its
  /// overlays, lighting, callout and events) for the proxy of the container's `SceneViewReader`.
  @MainActor func body(sceneView: @escaping (SceneViewProxy) -> SceneView) -> AnyView
}
