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
      AsyncFunction("addFeatureWithTemplate") { (ref: FeatureLayerRef, templateName: String, attributes: [String: Any]?, geometry: [String: Any]?, apply: Bool?) in
        try await ref.addFeatureWithTemplate(templateName, attributes, geometry, apply)
      }
      AsyncFunction("addFeatureWithSubtype") { (ref: FeatureLayerRef, subtypeName: String, attributes: [String: Any]?, geometry: [String: Any]?, apply: Bool?) in
        try await ref.addFeatureWithSubtype(subtypeName, attributes, geometry, apply)
      }
      AsyncFunction("getContingentValues") { (ref: FeatureLayerRef, objectId: Int, fieldName: String) in
        try await ref.getContingentValues(objectId, fieldName)
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
      AsyncFunction("getServiceGeodatabase") { (ref: FeatureLayerRef) in
        try await ref.getServiceGeodatabase()
      }
    }

    // Per-service token credential — mint a token for a specific URL and add it to the store.
    AsyncFunction("setServiceCredential") { (serviceUrl: String, username: String, password: String, tokenExpirationMinutes: Int?) in
      guard let url = URL(string: serviceUrl) else {
        throw NSError(domain: "ExpoArcgis", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid service URL: \(serviceUrl)"])
      }
      let credential = try await TokenCredential.credential(
        for: url,
        username: username,
        password: password,
        tokenExpirationMinutes: tokenExpirationMinutes
      )
      try ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(credential, for: url)
    }

    // Tile-cache size estimation — quick estimate before committing to a download.
    // Kept here for back-compat; the preferred entry point is the geometry module registration.
    AsyncFunction("estimateTileCacheSize") { (tileServiceUrl: String, areaOfInterest: [String: Any], options: [String: Any]?) in
      try await estimateTileCacheSize(tileServiceUrl, areaOfInterest, nil, nil)
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

    // Branch versioning — a service geodatabase handle obtained from FeatureLayerRef.getServiceGeodatabase().
    Class(ServiceGeodatabaseRef.self) {
      AsyncFunction("fetchVersions") { (ref: ServiceGeodatabaseRef) in
        try await ref.fetchVersions()
      }
      AsyncFunction("createVersion") { (ref: ServiceGeodatabaseRef, params: [String: Any]) in
        try await ref.createVersion(params)
      }
      AsyncFunction("switchVersion") { (ref: ServiceGeodatabaseRef, name: String) in
        try await ref.switchVersion(name)
      }
      AsyncFunction("applyEdits") { (ref: ServiceGeodatabaseRef) in
        try await ref.applyEdits()
      }
      AsyncFunction("undoLocalEdits") { (ref: ServiceGeodatabaseRef) in
        try await ref.undoLocalEdits()
      }
      Function("hasLocalEdits") { (ref: ServiceGeodatabaseRef) in ref.hasLocalEdits() }
      Function("getVersionName") { (ref: ServiceGeodatabaseRef) in ref.getVersionName() }
      Function("getDefaultVersionName") { (ref: ServiceGeodatabaseRef) in ref.getDefaultVersionName() }
      Function("supportsBranchVersioning") { (ref: ServiceGeodatabaseRef) in ref.supportsBranchVersioning() }
      Function("getFeatureLayer") { (ref: ServiceGeodatabaseRef, layerId: Int) in try ref.getFeatureLayer(layerId) }
    }

    // Local mobile geodatabase with transactional editing.
    AsyncFunction("openGeodatabase") { (path: String) in
      try await openGeodatabase(path)
    }
    Class(GeodatabaseRef.self) {
      AsyncFunction("beginTransaction") { (ref: GeodatabaseRef) in try await ref.beginTransaction() }
      AsyncFunction("commitTransaction") { (ref: GeodatabaseRef) in try await ref.commitTransaction() }
      AsyncFunction("rollbackTransaction") { (ref: GeodatabaseRef) in try await ref.rollbackTransaction() }
      AsyncFunction("queryFeatureCount") { (ref: GeodatabaseRef, tableName: String, whereClause: String?) in
        try await ref.queryFeatureCount(tableName, whereClause)
      }
      AsyncFunction("addFeature") { (ref: GeodatabaseRef, tableName: String, attributes: [String: Any], geometry: [String: Any]?) in
        try await ref.addFeature(tableName, attributes, geometry)
      }
      Function("isInTransaction") { (ref: GeodatabaseRef) in ref.isInTransaction() }
      Function("getFeatureTableNames") { (ref: GeodatabaseRef) in ref.getFeatureTableNames() }
      Function("getFeatureLayer") { (ref: GeodatabaseRef, tableName: String) in try ref.getFeatureLayer(tableName) }
    }

    // Moved from the main module to stay under the Android 64 KB method-size limit on definition().
    Class(UtilityNetworkRef.self) {
      Constructor { (props: [String: Any]) -> UtilityNetworkRef in
        UtilityNetworkRef(serviceGeodatabaseUrl: props["serviceGeodatabaseUrl"] as? String ?? "")
      }
      AsyncFunction("load") { (ref: UtilityNetworkRef, map: MapRef) in
        try await ref.load(map)
      }
      Function("describeNetwork") { (ref: UtilityNetworkRef) in ref.describeNetwork() }
      AsyncFunction("trace") { (ref: UtilityNetworkRef, traceType: String, startingLocations: [[String: Any]]) in
        try await ref.trace(traceType, startingLocations)
      }
      AsyncFunction("traceFromQuery") { (ref: UtilityNetworkRef, tableName: String, whereClause: String, traceType: String) in
        try await ref.traceFromQuery(tableName, whereClause, traceType)
      }
      AsyncFunction("queryNamedTraceConfigurations") { (ref: UtilityNetworkRef) in
        try await ref.queryNamedTraceConfigurations()
      }
      AsyncFunction("traceWithConfiguration") { (ref: UtilityNetworkRef, configGlobalId: String, tableName: String, whereClause: String) in
        try await ref.traceWithConfiguration(configGlobalId, tableName, whereClause)
      }
      AsyncFunction("associations") { (ref: UtilityNetworkRef, tableName: String, whereClause: String) in
        try await ref.associations(tableName, whereClause)
      }
      Function("getTerminalConfigurations") { (ref: UtilityNetworkRef) in
        ref.getTerminalConfigurations()
      }
      AsyncFunction("getState") { (ref: UtilityNetworkRef) in try await ref.getState() }
      Function("validateNetworkTopology") { (ref: UtilityNetworkRef, extent: [String: Any]) in
        ref.validateNetworkTopology(extent)
      }
    }

    // Georeferenced image overlay (added to a <MapView> via <ImageOverlay>).
    Class(ImageOverlayRef.self) {
      Constructor { () -> ImageOverlayRef in ImageOverlayRef() }
      Function("setFrame") { (ref: ImageOverlayRef, imagePath: String, extent: [String: Any], opacity: Double?) in
        ref.setFrame(imagePath, extent, opacity)
      }
      Function("setOpacity") { (ref: ImageOverlayRef, opacity: Double) in ref.setOpacity(opacity) }
    }
  }
}
