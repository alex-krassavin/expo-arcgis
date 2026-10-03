import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `WorldScaleSceneView` around a `<SceneView>`: the scene lines up with the real
/// world around the device, positioned by ARKit and the device's location. The Toolkit's
/// `AppleWorldTracking` tracks the world, with its camera feed.
final class WorldScaleContainer: SharedObject, SceneViewContainer {
  private let settings = WorldScaleSettings()
  private let providers = WorldTrackingProviders()

  /// Applies the JS props: `trackingMode`, `clippingDistance`, `calibrationViewHidden`,
  /// `calibrationButtonAlignment`.
  func update(_ props: [String: Any]) {
    settings.trackingMode = trackingMode(props["trackingMode"] as? String)
    settings.clippingDistance = double(props["clippingDistance"])
    settings.calibrationViewHidden = props["calibrationViewHidden"] as? Bool ?? false
    settings.calibrationButtonAlignment = alignment(props["calibrationButtonAlignment"] as? String)
  }

  @MainActor func body(sceneView: @escaping (SceneViewProxy) -> SceneView) -> AnyView {
    AnyView(
      WorldScaleContent(settings: settings, providers: providers, sceneView: sceneView) {
        [weak self] isCalibrating in
        self?.emit(event: "onCalibratingChange", payload: ["isCalibrating": isCalibrating])
      }
    )
  }
}

final class WorldScaleSettings: ObservableObject {
  @Published var trackingMode: AppleWorldTracking.Mode = .worldTracking
  @Published var clippingDistance: Double?
  @Published var calibrationViewHidden = false
  @Published var calibrationButtonAlignment: Alignment = .bottom
}

/// The world tracking provider, made once per tracking mode.
final class WorldTrackingProviders {
  private var provider: AppleWorldTracking?

  @MainActor func provider(for mode: AppleWorldTracking.Mode) -> AppleWorldTracking {
    if let provider, provider.mode == mode { return provider }
    let provider = AppleWorldTracking(mode: mode)
    self.provider = provider
    return provider
  }
}

private struct WorldScaleContent: View {
  @ObservedObject var settings: WorldScaleSettings
  let providers: WorldTrackingProviders
  let sceneView: (SceneViewProxy) -> SceneView
  let onCalibratingChanged: (Bool) -> Void

  var body: some View {
    WorldScaleSceneView(
      provider: providers.provider(for: settings.trackingMode),
      cameraFeedView: { context in AppleWorldTrackingCameraFeedView(context: context) },
      sceneView: sceneView
    )
      .calibrationViewHidden(settings.calibrationViewHidden)
      .calibrationButtonAlignment(settings.calibrationButtonAlignment)
      .clippingDistance(settings.clippingDistance)
      .onCalibratingChanged(perform: onCalibratingChanged)
      // A new provider starts a new view, which starts it (and the old one stops).
      .id(String(describing: settings.trackingMode))
  }
}

/// `AppleWorldTracking.Mode` from its JS name; world tracking, the Toolkit's default, otherwise.
private func trackingMode(_ name: String?) -> AppleWorldTracking.Mode {
  switch name {
  case "preferGeoTracking": return .preferGeoTracking
  case "geoTracking": return .geoTracking
  default: return .worldTracking
  }
}

/// A SwiftUI `Alignment` from its JS name; `bottom`, the Toolkit's default, otherwise.
private func alignment(_ name: String?) -> Alignment {
  switch name {
  case "top": return .top
  case "topLeading": return .topLeading
  case "topTrailing": return .topTrailing
  case "leading": return .leading
  case "center": return .center
  case "trailing": return .trailing
  case "bottomLeading": return .bottomLeading
  case "bottomTrailing": return .bottomTrailing
  default: return .bottom
  }
}
