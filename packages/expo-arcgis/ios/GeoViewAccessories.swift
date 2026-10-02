import ArcGIS
import ExpoModulesCore
import SwiftUI

/// UI that a package built on expo-arcgis draws over a `<MapView>`: the ArcGIS Toolkit's compass,
/// scalebar… (expo-arcgis-toolkit). The package's shared object adopts this protocol; JS hands it to
/// the view (`GeoViewHost.addAccessory`), and the view renders it in its own overlay, at
/// `alignment`, inside the view's `contentInsets`.
public protocol GeoViewAccessory: AnyObject {
  /// Where in the view the accessory sits.
  var alignment: Alignment { get }
  /// The accessory's content, with the view's live state.
  func body(in view: GeoViewState) -> AnyView
}

/// The live state of a `<MapView>`, for its accessories.
///
/// Kept apart from the view's own model: the viewpoint changes on every frame of a pan, and only the
/// accessories should re-render with it, not the map.
public final class GeoViewState: ObservableObject {
  /// Operations on the map view (viewpoint animations, identify…). Nil until the view appears.
  public internal(set) var mapViewProxy: MapViewProxy?
  /// The map the view shows.
  @Published public internal(set) var map: Map?
  /// The view's viewpoint, by center and scale. Its `rotation` is the map's rotation.
  @Published public internal(set) var viewpoint: Viewpoint?
  /// Map units per screen point at the view's center.
  @Published public internal(set) var unitsPerPoint: Double?
  @Published public internal(set) var spatialReference: SpatialReference?
  @Published public internal(set) var visibleArea: ArcGIS.Polygon?
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
  }

  private struct Item: Identifiable {
    let accessory: GeoViewAccessory
    var id: ObjectIdentifier { ObjectIdentifier(accessory) }
  }
}
