package expo.modules.arcgis

import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Second native module hosting the GeometryEngine + CoordinateFormatter operations, exposed to
 * JS as `ExpoArcgisGeometry`. Split out of [ExpoArcgisModule] so that neither module's
 * `definition()` exceeds the JVM 64 KB method-size limit.
 */
class ExpoArcgisGeometryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArcgisGeometry")

    // GeometryEngine — spatial operations exposed as the JS `geometryEngine` namespace.
    Function("geProject", ::geProject)
    Function("geBuffer", ::geBuffer)
    Function("geGeodeticBuffer", ::geGeodeticBuffer)
    Function("geArea", ::geArea)
    Function("geGeodeticArea", ::geGeodeticArea)
    Function("geLength", ::geLength)
    Function("geGeodeticLength", ::geGeodeticLength)
    Function("geDistance", ::geDistance)
    Function("geGeodeticDistance", ::geGeodeticDistance)
    Function("geUnion", ::geUnion)
    Function("geIntersection", ::geIntersection)
    Function("geDifference", ::geDifference)
    Function("geSymmetricDifference", ::geSymmetricDifference)
    Function("geClip", ::geClip)
    Function("geCut", ::geCut)
    Function("geConvexHull", ::geConvexHull)
    Function("geLabelPoint", ::geLabelPoint)
    Function("geNormalizeCentralMeridian", ::geNormalizeCentralMeridian)
    Function("geReshape", ::geReshape)
    Function("geIntersections", ::geIntersections)
    Function("geExtend", ::geExtend)
    Function("geAutoComplete", ::geAutoComplete)
    Function("geBoundary", ::geBoundary)
    Function("geSimplify", ::geSimplify)
    Function("geDensify", ::geDensify)
    Function("geGeneralize", ::geGeneralize)
    Function("geOffset", ::geOffset)
    Function("geCombineExtents", ::geCombineExtents)
    Function("geContains", ::geContains)
    Function("geCrosses", ::geCrosses)
    Function("geDisjoint", ::geDisjoint)
    Function("geEquals", ::geEquals)
    Function("geIntersects", ::geIntersects)
    Function("geOverlaps", ::geOverlaps)
    Function("geTouches", ::geTouches)
    Function("geWithin", ::geWithin)
    Function("geRelate", ::geRelate)
    Function("geIsSimple", ::geIsSimple)
    Function("geNearestCoordinate", ::geNearestCoordinate)
    Function("geNearestVertex", ::geNearestVertex)
    Function("geMove", ::geMove)
    Function("geRotate", ::geRotate)
    Function("geScale", ::geScale)

    // CoordinateFormatter — point <-> notation strings, exposed as the JS `coordinateFormatter` namespace.
    Function("cfToLatLong", ::cfToLatLong)
    Function("cfFromLatLong", ::cfFromLatLong)
    Function("cfToMgrs", ::cfToMgrs)
    Function("cfFromMgrs", ::cfFromMgrs)
    Function("cfToUsng", ::cfToUsng)
    Function("cfFromUsng", ::cfFromUsng)
    Function("cfToUtm", ::cfToUtm)
    Function("cfFromUtm", ::cfFromUtm)

    // Geocoding — address <-> coordinates search, exposed as the JS `geocoder` namespace.
    AsyncFunction("geocode") Coroutine { searchText: String, params: Map<String, Any?> ->
      geocode(searchText, params)
    }
    AsyncFunction("reverseGeocode") Coroutine { point: Map<String, Any?>, params: Map<String, Any?> ->
      reverseGeocode(point, params)
    }
    AsyncFunction("suggest") Coroutine { searchText: String, params: Map<String, Any?> ->
      suggest(searchText, params)
    }

    // Routing — solve a route between stops, exposed as the JS `router` namespace.
    AsyncFunction("solveRoute") Coroutine { stops: List<Map<String, Any?>>, params: Map<String, Any?> ->
      solveRoute(stops, params)
    }

    // Geoprocessing — run a geoprocessing service, exposed as the JS `geoprocessor` namespace.
    AsyncFunction("executeGeoprocessing") Coroutine { serviceUrl: String, inputs: Map<String, Any?> ->
      executeGeoprocessing(appContext, serviceUrl, inputs)
    }

    // Job handle for long-running downloads — emits onProgress, awaits via result(), supports cancel().
    Class(JobRef::class) {
      Events("onProgress")
      AsyncFunction("result") Coroutine { ref: JobRef -> ref.result() }
      AsyncFunction("cancel") Coroutine { ref: JobRef -> ref.cancel() }
    }

    // Extended operational layers from a service URL — registered here (not in the main module) to
    // keep ExpoArcgisModule's definition under the JVM 64 KB method limit. SharedObjects are global,
    // so a layer constructed via this module attaches to a `<MapView>` from the main module fine.
    Class(AnnotationLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        AnnotationLayerRef(appContext, props["url"] as? String ?: "").also { it.applyProps(props) }
      }
      Function("applyProps") { ref: AnnotationLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    Class(DimensionLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        DimensionLayerRef(appContext, props["url"] as? String ?: "").also { it.applyProps(props) }
      }
      Function("applyProps") { ref: DimensionLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    Class(BuildingSceneLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        BuildingSceneLayerRef(appContext, props["url"] as? String ?: "").also { it.applyProps(props) }
      }
      Function("applyProps") { ref: BuildingSceneLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    Class(OrientedImageryLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        OrientedImageryLayerRef(appContext, props["url"] as? String ?: "").also { it.applyProps(props) }
      }
      Function("applyProps") { ref: OrientedImageryLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    Class(SubtypeFeatureLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        SubtypeFeatureLayerRef(appContext, props["url"] as? String ?: "").also { it.applyProps(props) }
      }
      Function("applyProps") { ref: SubtypeFeatureLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
    }
    // GroupLayer — a container layer that hosts its own child layers (addLayer/removeLayer).
    Class(GroupLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        GroupLayerRef(appContext).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: GroupLayerRef, changed: Map<String, Any?> -> ref.applyProps(changed) }
      Function("addLayer") { ref: GroupLayerRef, layer: LayerRef -> ref.addLayer(layer) }
      Function("removeLayer") { ref: GroupLayerRef, layer: LayerRef -> ref.removeLayer(layer) }
    }
    // FeatureLayerRef lives here (not on the main module) so neither definition() exceeds the 64 KB limit.
    Class(FeatureLayerRef::class) {
      Constructor { props: Map<String, Any?> ->
        FeatureLayerRef(appContext, props).also { it.applyProps(props) }
      }
      Function("applyProps") { ref: FeatureLayerRef, changed: Map<String, Any?> ->
        ref.applyProps(changed)
      }
      AsyncFunction("queryFeatures") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryFeatures(query)
      }
      AsyncFunction("queryFeatureCount") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryFeatureCount(query)
      }
      AsyncFunction("queryExtent") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?>? ->
        ref.queryExtent(query)
      }
      AsyncFunction("queryStatistics") Coroutine { ref: FeatureLayerRef, query: Map<String, Any?> ->
        ref.queryStatistics(query)
      }
      AsyncFunction("queryFeatureTemplates") Coroutine { ref: FeatureLayerRef ->
        ref.queryFeatureTemplates()
      }
      AsyncFunction("addFeature") Coroutine { ref: FeatureLayerRef, attributes: Map<String, Any?>, geometry: Map<String, Any?>?, apply: Boolean? ->
        ref.addFeature(attributes, geometry, apply)
      }
      AsyncFunction("updateFeature") Coroutine { ref: FeatureLayerRef, objectId: Long, changes: Map<String, Any?>, apply: Boolean? ->
        ref.updateFeature(objectId, changes, apply)
      }
      AsyncFunction("deleteFeature") Coroutine { ref: FeatureLayerRef, objectId: Long, apply: Boolean? ->
        ref.deleteFeature(objectId, apply)
      }
      AsyncFunction("applyEdits") Coroutine { ref: FeatureLayerRef ->
        ref.applyEdits()
      }
      AsyncFunction("undoLocalEdits") Coroutine { ref: FeatureLayerRef ->
        ref.undoLocalEdits()
      }
      AsyncFunction("queryRelatedFeatures") Coroutine { ref: FeatureLayerRef, objectId: Long ->
        ref.queryRelatedFeatures(objectId)
      }
    }

    // Offline — take maps/data offline, exposed as the JS `offline` namespace.
    AsyncFunction("generateOfflineMap") Coroutine { portalItemId: String, areaOfInterest: Map<String, Any?>, downloadName: String ->
      generateOfflineMap(appContext, appContext.reactContext?.filesDir, portalItemId, areaOfInterest, downloadName)
    }
    AsyncFunction("syncOfflineMap") Coroutine { mobileMapPackagePath: String ->
      syncOfflineMap(appContext, mobileMapPackagePath)
    }
    AsyncFunction("preplannedMapAreas") Coroutine { portalItemId: String ->
      preplannedMapAreas(portalItemId)
    }
    AsyncFunction("downloadPreplannedOfflineMap") Coroutine { portalItemId: String, areaIndex: Int, downloadName: String ->
      downloadPreplannedOfflineMap(appContext, appContext.reactContext?.filesDir, portalItemId, areaIndex, downloadName)
    }
    AsyncFunction("generateGeodatabase") Coroutine { featureServiceUrl: String, extent: Map<String, Any?>, downloadName: String ->
      generateGeodatabase(appContext, appContext.reactContext?.filesDir, featureServiceUrl, extent, downloadName)
    }
    AsyncFunction("syncGeodatabase") Coroutine { geodatabasePath: String, featureServiceUrl: String ->
      syncGeodatabase(appContext, geodatabasePath, featureServiceUrl)
    }
    AsyncFunction("exportTileCache") Coroutine { tileServiceUrl: String, areaOfInterest: Map<String, Any?>, downloadName: String ->
      exportTileCache(appContext, appContext.reactContext?.filesDir, tileServiceUrl, areaOfInterest, downloadName)
    }
    AsyncFunction("exportVectorTiles") Coroutine { vectorTileServiceUrl: String, areaOfInterest: Map<String, Any?>, downloadName: String ->
      exportVectorTiles(appContext, appContext.reactContext?.filesDir, vectorTileServiceUrl, areaOfInterest, downloadName)
    }
  }
}
