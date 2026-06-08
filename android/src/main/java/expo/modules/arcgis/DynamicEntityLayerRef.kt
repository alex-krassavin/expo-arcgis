package expo.modules.arcgis

import com.arcgismaps.mapping.layers.DynamicEntityLayer
import com.arcgismaps.mapping.layers.Layer
import com.arcgismaps.realtime.ArcGISStreamService
import com.arcgismaps.realtime.ConnectionStatus
import com.arcgismaps.realtime.DynamicEntityDataSource
import com.arcgismaps.realtime.DynamicEntityQueryParameters
import expo.modules.kotlin.AppContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Operational [DynamicEntityLayer] backed by a real-time data source (a stream service — moving
 * entities that update live). Emits `onConnectionStatusChange` as the data source connects.
 */
class DynamicEntityLayerRef(appContext: AppContext, props: Map<String, Any?>) : LayerRef(appContext) {
  val dataSource: DynamicEntityDataSource =
    ArcGISStreamService(props["streamServiceUrl"] as? String ?: "")
  override val layer: Layer = DynamicEntityLayer(dataSource)
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  init {
    scope.launch {
      dataSource.connectionStatus.collect { status ->
        emit("onConnectionStatusChange", mapOf("status" to connectionStatusString(status)))
      }
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
