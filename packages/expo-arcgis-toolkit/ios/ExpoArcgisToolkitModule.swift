import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

// SPIKE — build-compatibility probe, replaced by the real components. It compiles, on each Expo
// SDK the harness covers:
// - toolkit SwiftUI views (Compass, BasemapGallery) hosted in an Expo view;
// - the toolkit's Swift package next to the SDK package the core already brings;
// - a core shared object (MapRef) resolved from another module.
public class ExpoArcgisToolkitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgisToolkit")

    View(ToolkitProbeView.self) {
      Prop("map") { (view: ToolkitProbeView, ref: MapRef?) in
        view.mapRef = ref
      }
    }
  }
}

final class ToolkitProbeView: ExpoView {
  var mapRef: MapRef?
  private var hostingController: UIHostingController<ToolkitProbeContent>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    let hostingController = UIHostingController(rootView: ToolkitProbeContent())
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }
}

struct ToolkitProbeContent: View {
  var body: some View {
    VStack {
      Compass(rotation: 0) {}
      BasemapGallery()
    }
  }
}
