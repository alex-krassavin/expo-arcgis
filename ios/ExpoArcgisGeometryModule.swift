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
