package expo.modules.arcgis

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
    }
  }
}
