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
  }
}
