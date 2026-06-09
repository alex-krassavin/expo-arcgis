import ArcGIS
import ExpoModulesCore

/// Second native module hosting the GeometryEngine + CoordinateFormatter operations, exposed to
/// JS as `ExpoArcgisGeometry`. Kept separate from `ExpoArcgisModule` for parity with Android,
/// where splitting these out avoids the JVM 64 KB method-size limit.
public class ExpoArcgisGeometryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoArcgisGeometry")

    // GeometryEngine — spatial operations exposed as the JS `geometryEngine` namespace.
    Function("geProject", geProject)
    Function("geBuffer", geBuffer)
    Function("geGeodeticBuffer", geGeodeticBuffer)
    Function("geArea", geArea)
    Function("geGeodeticArea", geGeodeticArea)
    Function("geLength", geLength)
    Function("geGeodeticLength", geGeodeticLength)
    Function("geDistance", geDistance)
    Function("geGeodeticDistance", geGeodeticDistance)
    Function("geUnion", geUnion)
    Function("geIntersection", geIntersection)
    Function("geDifference", geDifference)
    Function("geSymmetricDifference", geSymmetricDifference)
    Function("geClip", geClip)
    Function("geCut", geCut)
    Function("geConvexHull", geConvexHull)
    Function("geLabelPoint", geLabelPoint)
    Function("geNormalizeCentralMeridian", geNormalizeCentralMeridian)
    Function("geReshape", geReshape)
    Function("geIntersections", geIntersections)
    Function("geExtend", geExtend)
    Function("geAutoComplete", geAutoComplete)
    Function("geBoundary", geBoundary)
    Function("geSimplify", geSimplify)
    Function("geDensify", geDensify)
    Function("geGeneralize", geGeneralize)
    Function("geOffset", geOffset)
    Function("geCombineExtents", geCombineExtents)
    Function("geContains", geContains)
    Function("geCrosses", geCrosses)
    Function("geDisjoint", geDisjoint)
    Function("geEquals", geEquals)
    Function("geIntersects", geIntersects)
    Function("geOverlaps", geOverlaps)
    Function("geTouches", geTouches)
    Function("geWithin", geWithin)
    Function("geRelate", geRelate)
    Function("geIsSimple", geIsSimple)
    Function("geNearestCoordinate", geNearestCoordinate)
    Function("geNearestVertex", geNearestVertex)
    Function("geMove", geMove)
    Function("geRotate", geRotate)
    Function("geScale", geScale)

    // CoordinateFormatter — point <-> notation strings, exposed as the JS `coordinateFormatter` namespace.
    Function("cfToLatLong", cfToLatLong)
    Function("cfFromLatLong", cfFromLatLong)
    Function("cfToMgrs", cfToMgrs)
    Function("cfFromMgrs", cfFromMgrs)
    Function("cfToUsng", cfToUsng)
    Function("cfFromUsng", cfFromUsng)
    Function("cfToUtm", cfToUtm)
    Function("cfFromUtm", cfFromUtm)

    // Geocoding — address <-> coordinates search, exposed as the JS `geocoder` namespace.
    AsyncFunction("geocode") { (searchText: String, params: [String: Any]) in
      try await geocode(searchText, params)
    }
    AsyncFunction("reverseGeocode") { (point: [String: Any], params: [String: Any]) in
      try await reverseGeocode(point, params)
    }
    AsyncFunction("suggest") { (searchText: String, params: [String: Any]) in
      try await suggest(searchText, params)
    }

    // Routing — solve a route between stops, exposed as the JS `router` namespace.
    AsyncFunction("solveRoute") { (stops: [[String: Any]], params: [String: Any]) in
      try await solveRoute(stops, params)
    }

    // Geoprocessing — run a geoprocessing service, exposed as the JS `geoprocessor` namespace.
    AsyncFunction("executeGeoprocessing") { (serviceUrl: String, inputs: [String: Any]) in
      try await executeGeoprocessing(serviceUrl, inputs)
    }

    // Job handle for long-running downloads — emits onProgress, awaits via result(), supports cancel().
    Class(JobRef.self) {
      AsyncFunction("result") { (ref: JobRef) in try await ref.result() }
      AsyncFunction("cancel") { (ref: JobRef) in await ref.cancel() }
    }

    // Extended operational layers from a service URL — registered here (not in the main module) to
    // keep ExpoArcgisModule's definition under the JVM 64 KB method limit. SharedObjects are global,
    // so a layer constructed via this module attaches to a `<MapView>` from the main module fine.
    Class(AnnotationLayerRef.self) {
      Constructor { (props: [String: Any]) -> AnnotationLayerRef in
        let ref = AnnotationLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: AnnotationLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    Class(DimensionLayerRef.self) {
      Constructor { (props: [String: Any]) -> DimensionLayerRef in
        let ref = DimensionLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: DimensionLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    Class(BuildingSceneLayerRef.self) {
      Constructor { (props: [String: Any]) -> BuildingSceneLayerRef in
        let ref = BuildingSceneLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: BuildingSceneLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    Class(OrientedImageryLayerRef.self) {
      Constructor { (props: [String: Any]) -> OrientedImageryLayerRef in
        let ref = OrientedImageryLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: OrientedImageryLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    Class(SubtypeFeatureLayerRef.self) {
      Constructor { (props: [String: Any]) -> SubtypeFeatureLayerRef in
        let ref = SubtypeFeatureLayerRef(url: props["url"] as? String ?? "")
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: SubtypeFeatureLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    // GroupLayer — a container layer that hosts its own child layers (addLayer/removeLayer).
    Class(GroupLayerRef.self) {
      Constructor { (props: [String: Any]) -> GroupLayerRef in
        let ref = GroupLayerRef()
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: GroupLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
      Function("addLayer") { (ref: GroupLayerRef, layer: LayerRef) in ref.addLayer(layer) }
      Function("removeLayer") { (ref: GroupLayerRef, layer: LayerRef) in ref.removeLayer(layer) }
    }
    // FeatureLayerRef lives here (not on the main module) so neither definition() exceeds the 64 KB limit.
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
    }
    // In-memory FeatureCollectionLayer — built from a client-side schema + features (no service).
    Class(FeatureCollectionLayerRef.self) {
      Constructor { (props: [String: Any]) -> FeatureCollectionLayerRef in
        let ref = FeatureCollectionLayerRef(props: props)
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: FeatureCollectionLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }
    // GeoPackage layer — async-loads a local .gpkg, picks the feature table, wraps it in a FeatureLayer.
    Class(GeoPackageLayerRef.self) {
      Constructor { (props: [String: Any]) -> GeoPackageLayerRef in
        let ref = GeoPackageLayerRef(
          path: props["path"] as? String ?? "",
          tableName: props["tableName"] as? String
        )
        ref.applyProps(props)
        return ref
      }
      Function("applyProps") { (ref: GeoPackageLayerRef, changed: [String: Any]) in ref.applyProps(changed) }
    }

    // Offline — take maps/data offline, exposed as the JS `offline` namespace.
    AsyncFunction("generateOfflineMap") { (portalItemId: String, areaOfInterest: [String: Any], downloadName: String) in
      try await generateOfflineMap(portalItemId, areaOfInterest, downloadName)
    }
    AsyncFunction("syncOfflineMap") { (mobileMapPackagePath: String) in
      try await syncOfflineMap(mobileMapPackagePath)
    }
    AsyncFunction("preplannedMapAreas") { (portalItemId: String) in
      try await preplannedMapAreas(portalItemId)
    }
    AsyncFunction("downloadPreplannedOfflineMap") { (portalItemId: String, areaIndex: Int, downloadName: String) in
      try await downloadPreplannedOfflineMap(portalItemId, areaIndex, downloadName)
    }
    AsyncFunction("generateGeodatabase") { (featureServiceUrl: String, extent: [String: Any], downloadName: String) in
      try await generateGeodatabase(featureServiceUrl, extent, downloadName)
    }
    AsyncFunction("syncGeodatabase") { (geodatabasePath: String, featureServiceUrl: String) in
      try await syncGeodatabase(geodatabasePath, featureServiceUrl)
    }
    AsyncFunction("exportTileCache") { (tileServiceUrl: String, areaOfInterest: [String: Any], downloadName: String) in
      try await exportTileCache(tileServiceUrl, areaOfInterest, downloadName)
    }
    AsyncFunction("exportVectorTiles") { (vectorTileServiceUrl: String, areaOfInterest: [String: Any], downloadName: String) in
      try await exportVectorTiles(vectorTileServiceUrl, areaOfInterest, downloadName)
    }
  }
}
