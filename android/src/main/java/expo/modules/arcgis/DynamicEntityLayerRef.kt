package expo.modules.arcgis

import com.arcgismaps.data.Field
import com.arcgismaps.data.FieldType
import com.arcgismaps.mapping.layers.DynamicEntityLayer
import com.arcgismaps.mapping.layers.Layer
import com.arcgismaps.realtime.ArcGISStreamService
import com.arcgismaps.realtime.ArcGISStreamServiceFilter
import com.arcgismaps.realtime.ConnectionStatus
import com.arcgismaps.realtime.CustomDynamicEntityDataSource
import com.arcgismaps.realtime.DynamicEntityDataSource
import com.arcgismaps.realtime.DynamicEntityDataSourceInfo
import com.arcgismaps.realtime.DynamicEntityQueryParameters
import expo.modules.kotlin.AppContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

/**
 * Operational [DynamicEntityLayer] backed by a real-time data source (a stream service — moving
 * entities that update live). Emits `onConnectionStatusChange` as the data source connects.
 */
class DynamicEntityLayerRef(appContext: AppContext, props: Map<String, Any?>) : LayerRef(appContext) {
  // Non-null only in custom-source mode — observations pushed from JS are emitted into this flow.
  private val pushFlow: MutableSharedFlow<CustomDynamicEntityDataSource.FeedEvent>? =
    if (props["customSource"] != null) MutableSharedFlow(extraBufferCapacity = 64) else null
  val dataSource: DynamicEntityDataSource = buildDataSource(props, pushFlow)
  override val layer: Layer = DynamicEntityLayer(dataSource)
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  init {
    scope.launch {
      dataSource.connectionStatus.collect { status ->
        emit("onConnectionStatusChange", mapOf("status" to connectionStatusString(status)))
      }
    }
    // Emit entity-received events (new/updated observation arrived for an entity).
    scope.launch {
      dataSource.dynamicEntityReceivedEvent.collect { info ->
        emit("onDynamicEntityChange", dynamicEntityPayload("received", info.dynamicEntity))
      }
    }
    // Emit entity-purged events (entity evicted by purge rules).
    scope.launch {
      dataSource.dynamicEntityPurgedEvent.collect { info ->
        emit("onDynamicEntityChange", dynamicEntityPayload("purged", info.dynamicEntity))
      }
    }
  }

  /** Pushes an observation into a custom data source (no-op for a stream service). */
  fun pushObservation(attributes: Map<String, Any?>, geometry: Map<String, Any?>) {
    val flow = pushFlow ?: return
    val geom = geometryFromDict(geometry) ?: return
    flow.tryEmit(CustomDynamicEntityDataSource.FeedEvent.NewObservation(geom, attributes))
  }

  /**
   * Returns the observation history for the entity with the given track id, newest first,
   * capped at [max] entries (default 100). Each observation carries its own `attributes` and
   * `geometry` snapshot at the time it was received.
   */
  suspend fun queryObservations(entityId: String, max: Int = 100): List<Map<String, Any?>> {
    val result = dataSource.queryDynamicEntities(listOf(entityId)).getOrThrow()
    val entity = result.toList().firstOrNull()
      ?: return emptyList()
    return entity.getObservations(max).map { obs ->
      val entry = mutableMapOf<String, Any?>(
        "attributes" to obs.attributes.toMap(),
      )
      obs.geometry?.let { entry["geometry"] = dictFromGeometry(it) }
      entry
    }
  }

  /** Returns the data source's currently-tracked dynamic entities (attributes + geometry). */
  suspend fun queryDynamicEntities(): Map<String, Any?> {
    val result = dataSource.queryDynamicEntities(DynamicEntityQueryParameters()).getOrThrow()
    val entities = result.toList()
    return mapOf(
      "count" to entities.size,
      "entities" to entities.map { entity ->
        mapOf(
          "attributes" to entity.attributes,
          "geometry" to entity.geometry?.let { dictFromGeometry(it) },
        )
      },
    )
  }

  override fun applyProps(changed: Map<String, Any?>) {
    applyCommonProps(changed)
    val entityLayer = layer as? DynamicEntityLayer ?: return
    (changed["trackDisplay"] as? Map<*, *>)?.let { track ->
      (track["maximumObservations"] as? Number)?.toInt()?.let {
        entityLayer.trackDisplayProperties.maximumObservations = it
      }
      (track["showsPreviousObservations"] as? Boolean)?.let {
        entityLayer.trackDisplayProperties.showPreviousObservations = it
      }
    }
    (changed["filter"] as? Map<*, *>)?.let { filterDict ->
      val filter = ArcGISStreamServiceFilter().apply {
        (filterDict["whereClause"] as? String)?.let { whereClause = it }
        (filterDict["geometry"] as? Map<*, *>)?.let { g -> geometryFromDict(g)?.let { geometry = it } }
      }
      (dataSource as? ArcGISStreamService)?.filter = filter
    }
    (changed["purgeOptions"] as? Map<*, *>)?.let { purgeDict ->
      val opts = dataSource.purgeOptions
      (purgeDict["maximumObservations"] as? Number)?.let { opts.maximumObservations = it.toLong() }
      (purgeDict["maximumDuration"] as? Number)?.let { opts.maximumDuration = it.toDouble() }
    }
  }

  override fun deallocate() {
    scope.cancel()
    super.deallocate()
  }
}

/** Maps [ConnectionStatus] to the JS string union. */
fun connectionStatusString(status: ConnectionStatus): String = when (status) {
  is ConnectionStatus.Disconnected -> "disconnected"
  is ConnectionStatus.Connecting -> "connecting"
  is ConnectionStatus.Connected -> "connected"
  is ConnectionStatus.Failed -> "failed"
}

/**
 * Builds a compact payload for the `onDynamicEntityChange` event.
 * Only `received` and `purged` change types are emitted (observation-only updates are
 * captured within `dynamicEntityReceivedEvent` which fires per-entity arrival, not per
 * observation, so the event rate is bounded to entity lifecycle changes).
 * Geometry is serialized only when present; attributes are passed as-is (the map returned
 * by the SDK is a shallow snapshot of the current entity attributes).
 */
private fun dynamicEntityPayload(changeType: String, entity: com.arcgismaps.realtime.DynamicEntity): Map<String, Any?> {
  val payload = mutableMapOf<String, Any?>(
    "changeType" to changeType,
    "entityId" to entity.id,
    "attributes" to entity.attributes.toMap(),
  )
  entity.geometry?.let { payload["geometry"] = dictFromGeometry(it) }
  return payload
}

/** Builds the real-time data source: a custom feed (push from JS) or a stream service. */
private fun buildDataSource(
  props: Map<String, Any?>,
  pushFlow: MutableSharedFlow<CustomDynamicEntityDataSource.FeedEvent>?,
): DynamicEntityDataSource {
  val custom = props["customSource"] as? Map<*, *>
  if (custom != null && pushFlow != null) {
    val info = DynamicEntityDataSourceInfo(
      custom["entityIdField"] as? String ?: "id",
      buildDynamicEntityFields(custom["fields"] as? List<*>),
    )
    return CustomDynamicEntityDataSource(object : CustomDynamicEntityDataSource.EntityFeedProvider {
      override val feed: SharedFlow<CustomDynamicEntityDataSource.FeedEvent> = pushFlow.asSharedFlow()
      override suspend fun onLoad(): DynamicEntityDataSourceInfo = info
      override suspend fun onConnect() {}
      override suspend fun onDisconnect() {}
    })
  }
  return ArcGISStreamService(props["streamServiceUrl"] as? String ?: "")
}

/** Builds [Field]s from JS `{ name, type }` defs for a custom data source. */
private fun buildDynamicEntityFields(defs: List<*>?): List<Field> =
  (defs ?: emptyList<Any?>()).filterIsInstance<Map<*, *>>().map { def ->
    Field(dynamicEntityFieldType(def["type"] as? String), def["name"] as? String ?: "", "", 0, null, true, true)
  }

private fun dynamicEntityFieldType(type: String?): FieldType = when (type) {
  "int32" -> FieldType.Int32
  "int64" -> FieldType.Int64
  "float64" -> FieldType.Float64
  "date" -> FieldType.Date
  else -> FieldType.Text
}
