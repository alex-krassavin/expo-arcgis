package expo.modules.arcgis

import com.arcgismaps.ArcGISEnvironment
import com.arcgismaps.httpcore.authentication.TokenCredential
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Third native module, hosting the heavier operational-layer SharedObject classes (currently
 * [FeatureLayerRef]), exposed to JS as `ExpoArcgisExtras`. Split out of [ExpoArcgisGeometryModule]
 * so that no module's `definition()` exceeds the JVM 64 KB method-size limit. SharedObjects are
 * global, so a ref constructed here attaches to a `<MapView>` from the main module fine.
 */
class ExpoArcgisExtrasModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoArcgisExtras")

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
      AsyncFunction("queryAttachments") Coroutine { ref: FeatureLayerRef, objectId: Long ->
        ref.queryAttachments(objectId)
      }
      AsyncFunction("addAttachment") Coroutine { ref: FeatureLayerRef, objectId: Long, name: String, contentType: String, dataBase64: String ->
        ref.addAttachment(objectId, name, contentType, dataBase64)
      }
      AsyncFunction("fetchAttachment") Coroutine { ref: FeatureLayerRef, objectId: Long, attachmentId: Long ->
        ref.fetchAttachment(objectId, attachmentId)
      }
      AsyncFunction("deleteAttachment") Coroutine { ref: FeatureLayerRef, objectId: Long, attachmentId: Long ->
        ref.deleteAttachment(objectId, attachmentId)
      }
      AsyncFunction("updateAttachment") Coroutine { ref: FeatureLayerRef, objectId: Long, attachmentId: Long, name: String, contentType: String, dataBase64: String ->
        ref.updateAttachment(objectId, attachmentId, name, contentType, dataBase64)
      }
      AsyncFunction("getServiceGeodatabase") Coroutine { ref: FeatureLayerRef ->
        ref.getServiceGeodatabase()
      }
    }

    // Per-service token credential — mint a token for a specific URL and add it to the store.
    AsyncFunction("setServiceCredential") Coroutine { serviceUrl: String, username: String, password: String, tokenExpirationMinutes: Int? ->
      val credential = TokenCredential.create(serviceUrl, username, password, tokenExpirationMinutes)
        .getOrThrow()
      ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(credential, serviceUrl)
        .getOrThrow()
    }

    // Tile-cache size estimation — quick estimate before committing to a download.
    AsyncFunction("estimateTileCacheSize") Coroutine { tileServiceUrl: String, areaOfInterest: Map<String, Any?>, options: Map<String, Any?>? ->
      estimateTileCacheSize(tileServiceUrl, areaOfInterest, options)
    }

    // Turn-by-turn navigation — solve a route and track device locations against it.
    AsyncFunction("createRouteTracker") Coroutine { stops: List<Map<String, Any?>>, params: Map<String, Any?> ->
      createRouteTracker(appContext, stops, params)
    }
    Class(RouteTrackerRef::class) {
      AsyncFunction("trackLocation") Coroutine { ref: RouteTrackerRef, location: Map<String, Any?> ->
        ref.trackLocation(location)
      }
      AsyncFunction("switchToNextDestination") Coroutine { ref: RouteTrackerRef ->
        ref.switchToNextDestination()
      }
    }

    // Branch versioning — a service geodatabase handle obtained from FeatureLayerRef.getServiceGeodatabase().
    Class(ServiceGeodatabaseRef::class) {
      AsyncFunction("fetchVersions") Coroutine { ref: ServiceGeodatabaseRef ->
        ref.fetchVersions()
      }
      AsyncFunction("createVersion") Coroutine { ref: ServiceGeodatabaseRef, params: Map<String, Any?> ->
        ref.createVersion(params)
      }
      AsyncFunction("switchVersion") Coroutine { ref: ServiceGeodatabaseRef, name: String ->
        ref.switchVersion(name)
      }
      AsyncFunction("applyEdits") Coroutine { ref: ServiceGeodatabaseRef ->
        ref.applyEdits()
      }
      AsyncFunction("undoLocalEdits") Coroutine { ref: ServiceGeodatabaseRef ->
        ref.undoLocalEdits()
      }
      Function("hasLocalEdits") { ref: ServiceGeodatabaseRef -> ref.hasLocalEdits() }
      Function("getVersionName") { ref: ServiceGeodatabaseRef -> ref.getVersionName() }
      Function("getDefaultVersionName") { ref: ServiceGeodatabaseRef -> ref.getDefaultVersionName() }
      Function("supportsBranchVersioning") { ref: ServiceGeodatabaseRef -> ref.supportsBranchVersioning() }
      Function("getFeatureLayer") { ref: ServiceGeodatabaseRef, layerId: Long -> ref.getFeatureLayer(layerId) }
    }

    // Local mobile geodatabase with transactional editing.
    AsyncFunction("openGeodatabase") Coroutine { path: String ->
      openGeodatabase(appContext, path)
    }
    Class(GeodatabaseRef::class) {
      AsyncFunction("beginTransaction") Coroutine { ref: GeodatabaseRef -> ref.beginTransaction() }
      AsyncFunction("commitTransaction") Coroutine { ref: GeodatabaseRef -> ref.commitTransaction() }
      AsyncFunction("rollbackTransaction") Coroutine { ref: GeodatabaseRef -> ref.rollbackTransaction() }
      AsyncFunction("queryFeatureCount") Coroutine { ref: GeodatabaseRef, tableName: String, whereClause: String? ->
        ref.queryFeatureCount(tableName, whereClause)
      }
      AsyncFunction("addFeature") Coroutine { ref: GeodatabaseRef, tableName: String, attributes: Map<String, Any?>, geometry: Map<String, Any?>? ->
        ref.addFeature(tableName, attributes, geometry)
      }
      Function("isInTransaction") { ref: GeodatabaseRef -> ref.isInTransaction() }
      Function("getFeatureTableNames") { ref: GeodatabaseRef -> ref.getFeatureTableNames() }
      Function("getFeatureLayer") { ref: GeodatabaseRef, tableName: String -> ref.getFeatureLayer(tableName) }
    }

    // Moved from the main module to stay under the Android 64 KB method-size limit on definition().
    Class(UtilityNetworkRef::class) {
      Constructor { props: Map<String, Any?> ->
        UtilityNetworkRef(appContext, props["serviceGeodatabaseUrl"] as? String ?: "")
      }
      AsyncFunction("load") Coroutine { ref: UtilityNetworkRef, map: MapRef ->
        ref.load(map)
      }
      Function("describeNetwork") { ref: UtilityNetworkRef -> ref.describeNetwork() }
      AsyncFunction("trace") Coroutine { ref: UtilityNetworkRef, traceType: String, startingLocations: List<Map<String, Any?>> ->
        ref.trace(traceType, startingLocations)
      }
      AsyncFunction("traceFromQuery") Coroutine { ref: UtilityNetworkRef, tableName: String, whereClause: String, traceType: String ->
        ref.traceFromQuery(tableName, whereClause, traceType)
      }
      AsyncFunction("queryNamedTraceConfigurations") Coroutine { ref: UtilityNetworkRef ->
        ref.queryNamedTraceConfigurations()
      }
      AsyncFunction("traceWithConfiguration") Coroutine { ref: UtilityNetworkRef, configGlobalId: String, tableName: String, whereClause: String ->
        ref.traceWithConfiguration(configGlobalId, tableName, whereClause)
      }
      AsyncFunction("associations") Coroutine { ref: UtilityNetworkRef, tableName: String, whereClause: String ->
        ref.associations(tableName, whereClause)
      }
      Function("getTerminalConfigurations") { ref: UtilityNetworkRef ->
        ref.getTerminalConfigurations()
      }
      AsyncFunction("getState") Coroutine { ref: UtilityNetworkRef -> ref.getState() }
      Function("validateNetworkTopology") { ref: UtilityNetworkRef, extent: Map<String, Any?> ->
        ref.validateNetworkTopology(extent)
      }
    }
  }
}
