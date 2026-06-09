import ArcGIS
import ExpoModulesCore

/// Third native module, hosting the heavier operational-layer SharedObject classes (currently
/// `FeatureLayerRef`), exposed to JS as `ExpoArcgisExtras`. Split out of `ExpoArcgisGeometryModule`
/// so that no module's `definition()` exceeds the JVM 64 KB method-size limit on Android.
/// SharedObjects are global, so a ref constructed here attaches to a `<MapView>` from the main
/// module fine.
public class ExpoArcgisExtrasModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgisExtras")

    Class(FeatureLayerRef.self) {
      Constructor { (props: [String: Any]) -> FeatureLayerRef in
        let ref = FeatureLayerRef(props: props)
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: FeatureLayerRef, changed: [String: Any]) in
        ref.applyProps(changed)
      }
      AsyncFunction("queryFeatures") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryFeatures(query)
      }
      AsyncFunction("queryFeatureCount") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryFeatureCount(query)
      }
      AsyncFunction("queryExtent") { (ref: FeatureLayerRef, query: [String: Any]?) in
        try await ref.queryExtent(query)
      }
      AsyncFunction("queryStatistics") { (ref: FeatureLayerRef, query: [String: Any]) in
        try await ref.queryStatistics(query)
      }
      AsyncFunction("queryFeatureTemplates") { (ref: FeatureLayerRef) in
        try await ref.queryFeatureTemplates()
      }
      AsyncFunction("addFeature") { (ref: FeatureLayerRef, attributes: [String: Any], geometry: [String: Any]?, apply: Bool?) in
        try await ref.addFeature(attributes, geometry, apply)
      }
      AsyncFunction("updateFeature") { (ref: FeatureLayerRef, objectId: Int, changes: [String: Any], apply: Bool?) in
        try await ref.updateFeature(objectId, changes, apply)
      }
      AsyncFunction("deleteFeature") { (ref: FeatureLayerRef, objectId: Int, apply: Bool?) in
        try await ref.deleteFeature(objectId, apply)
      }
      AsyncFunction("applyEdits") { (ref: FeatureLayerRef) in
        try await ref.applyEdits()
      }
      AsyncFunction("undoLocalEdits") { (ref: FeatureLayerRef) in
        try await ref.undoLocalEdits()
      }
      AsyncFunction("queryRelatedFeatures") { (ref: FeatureLayerRef, objectId: Int) in
        try await ref.queryRelatedFeatures(objectId)
      }
      AsyncFunction("queryAttachments") { (ref: FeatureLayerRef, objectId: Int) in
        try await ref.queryAttachments(objectId)
      }
      AsyncFunction("addAttachment") { (ref: FeatureLayerRef, objectId: Int, name: String, contentType: String, dataBase64: String) in
        try await ref.addAttachment(objectId, name, contentType, dataBase64)
      }
      AsyncFunction("fetchAttachment") { (ref: FeatureLayerRef, objectId: Int, attachmentId: Int) in
        try await ref.fetchAttachment(objectId, attachmentId)
      }
      AsyncFunction("deleteAttachment") { (ref: FeatureLayerRef, objectId: Int, attachmentId: Int) in
        try await ref.deleteAttachment(objectId, attachmentId)
      }
      AsyncFunction("updateAttachment") { (ref: FeatureLayerRef, objectId: Int, attachmentId: Int, name: String, contentType: String, dataBase64: String) in
        try await ref.updateAttachment(objectId, attachmentId, name, contentType, dataBase64)
      }
    }

    // Tile-cache size estimation — quick estimate before committing to a download.
    AsyncFunction("estimateTileCacheSize") { (tileServiceUrl: String, areaOfInterest: [String: Any], options: [String: Any]?) in
      try await estimateTileCacheSize(tileServiceUrl, areaOfInterest, options)
    }

    // Turn-by-turn navigation — solve a route and track device locations against it.
    AsyncFunction("createRouteTracker") { (stops: [[String: Any]], params: [String: Any]) in
      try await createRouteTracker(stops, params)
    }
    Class(RouteTrackerRef.self) {
      AsyncFunction("trackLocation") { (ref: RouteTrackerRef, location: [String: Any]) in
        try await ref.trackLocation(location)
      }
      AsyncFunction("switchToNextDestination") { (ref: RouteTrackerRef) in
        try await ref.switchToNextDestination()
      }
    }
  }
}
