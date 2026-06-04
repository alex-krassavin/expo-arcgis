import ArcGIS
import ExpoModulesCore

public class ExpoArcgisModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgis")

    OnCreate {
      // Pick up an API key injected at build time by the config plugin (Info.plist).
      if let key = readApiKeyFromInfoPlist() {
        ArcGISEnvironment.apiKey = APIKey(key)
      }
    }

    Function("setApiKey") { (apiKey: String) in
      ArcGISEnvironment.apiKey = APIKey(apiKey)
    }

    // Declarative map model — a SharedObject the JS <Map> constructs and reconciles.
    Class(ArcGISMapRef.self) {
      Constructor { (props: [String: Any]?) -> ArcGISMapRef in
        let ref = ArcGISMapRef()
        if let props {
          ref.applyProps(props)
        }
        return ref
      }

      Function("applyProps") { (ref: ArcGISMapRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
    }

    // 2D map host — receives the map SharedObject as the `map` prop.
    View(ExpoArcgisMapView.self) {
      Events("onMapLoaded", "onMapLoadError")

      Prop("map") { (view: ExpoArcgisMapView, ref: ArcGISMapRef?) in
        view.setMap(ref)
      }
    }
  }
}

private func readApiKeyFromInfoPlist() -> String? {
  guard let key = Bundle.main.object(forInfoDictionaryKey: "ArcGISAPIKey") as? String,
        !key.isEmpty else {
    return nil
  }
  return key
}
