import ArcGIS
import ExpoModulesCore
import SwiftUI

/// UI that a package built on expo-arcgis draws over a `<MapView>` or `<SceneView>`: the ArcGIS
/// Toolkit's compass, scalebar… (expo-arcgis-toolkit). The package's shared object adopts this protocol; JS hands it to
/// the view (`GeoViewHost.addAccessory`), and the view renders it in its own overlay, at
/// `alignment`, inside the view's `contentInsets`.
public protocol GeoViewAccessory: AnyObject {
  /// Where in the view the accessory sits.
  var alignment: Alignment { get }
  /// The accessory's content, with the view's live state.
  func body(in view: GeoViewState) -> AnyView
}

/// A `<MapView>` or `<SceneView>`, for packages built on expo-arcgis whose own views bind to it
/// (expo-arcgis-toolkit's bookmarks, search…). JS creates it with the view and hands it to those
/// views (`useGeoViewRef`); the view sets its live state on it.
public final class GeoViewRef: SharedObject, ObservableObject {
  /// The view's live state. Nil until the view has it, and once the view is gone.
  @Published public internal(set) var state: GeoViewState?
}

/// The live state of a `<MapView>` or `<SceneView>`, for its accessories.
///
/// Kept apart from the view's own model: the viewpoint changes on every frame of a pan, and only the
/// accessories should re-render with it, not the map.
public final class GeoViewState: ObservableObject {
  /// Operations on the map view (viewpoint animations, identify…). Nil for a `<SceneView>`, and until
  /// the view appears.
  public internal(set) var mapViewProxy: MapViewProxy?
  /// Operations on the scene view (camera animations, identify…). Nil for a `<MapView>`, and until
  /// the view appears.
  public internal(set) var sceneViewProxy: SceneViewProxy?
  /// Operations on a local scene view (camera animations, identify…). Nil for any other view, and
  /// until the view appears.
  public internal(set) var localSceneViewProxy: LocalSceneViewProxy?
  /// A `<MapView>`'s location display, which its `locationDisplay` prop configures. Nil for a
  /// `<SceneView>`.
  public internal(set) var locationDisplay: LocationDisplay?
  /// The map a `<MapView>` shows.
  @Published public internal(set) var map: Map?
  /// The scene a `<SceneView>` shows.
  @Published public internal(set) var scene: ArcGIS.Scene?
  /// A `<SceneView>`'s camera.
  @Published public internal(set) var camera: Camera?
  /// The view's viewpoint, by center and scale. Its `rotation` is the map's rotation.
  @Published public internal(set) var viewpoint: Viewpoint?
  /// Map units per screen point at the view's center.
  @Published public internal(set) var unitsPerPoint: Double?
  @Published public internal(set) var spatialReference: SpatialReference?
  @Published public internal(set) var visibleArea: ArcGIS.Polygon?
  /// Whether the user is panning, zooming or rotating the view, or it is animating.
  @Published public internal(set) var isNavigating = false
  /// Height of the attribution bar along the view's bottom edge. Accessories stay above it.
  @Published public internal(set) var attributionBarHeight: CGFloat = 0
}

/// Draws a map view's accessories over it, each at its alignment.
struct GeoViewAccessories: View {
  let accessories: [GeoViewAccessory]
  let insets: EdgeInsets
  @ObservedObject var state: GeoViewState

  var body: some View {
    ZStack {
      ForEach(accessories.map(Item.init)) { item in
        item.accessory.body(in: state)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: item.accessory.alignment)
      }
    }
    .padding(insets)
    .padding(.bottom, state.attributionBarHeight)
  }

  private struct Item: Identifiable {
    let accessory: GeoViewAccessory
    var id: ObjectIdentifier { ObjectIdentifier(accessory) }
  }
}
