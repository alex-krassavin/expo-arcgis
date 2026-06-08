package expo.modules.arcgis

import com.arcgismaps.Guid
import com.arcgismaps.data.ArcGISFeature
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.ServiceFeatureTable
import com.arcgismaps.data.ServiceGeodatabase
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.layers.SelectionMode
import com.arcgismaps.utilitynetworks.UtilityElement
import com.arcgismaps.utilitynetworks.UtilityElementTraceResult
import com.arcgismaps.utilitynetworks.UtilityNetwork
import com.arcgismaps.utilitynetworks.UtilityTraceParameters
import com.arcgismaps.utilitynetworks.UtilityTraceType
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * SharedObject wrapping a native [UtilityNetwork] loaded from a feature service's service
 * geodatabase. Built + loaded by the `<UtilityNetwork>` component, which then runs traces.
 */
class UtilityNetworkRef(appContext: AppContext, private val serviceGeodatabaseUrl: String) :
  SharedObject(appContext) {
  private var network: UtilityNetwork? = null

  /** Operational feature layers created for the network's tables, keyed by table name (for selection). */
  private val featureLayers = mutableMapOf<String, FeatureLayer>()

  /** Builds the network, loads it, adds it (and its feature layers) to the map, returns its name. */
  suspend fun load(mapRef: MapRef): String {
    val serviceGeodatabase = ServiceGeodatabase(serviceGeodatabaseUrl)
    serviceGeodatabase.load().getOrThrow()
    val network = UtilityNetwork(serviceGeodatabase)
    network.load().getOrThrow()
    this.network = network
    mapRef.map.utilityNetworks.add(network)
    // Display the network's feature layers so its devices / lines are visible and selectable.
    serviceGeodatabase.connectedTables.value.forEach { table ->
      val layer = FeatureLayer.createWithFeatureTable(table)
      featureLayers[table.tableName] = layer
      mapRef.map.operationalLayers.add(layer)
    }
    return network.name
  }

  /** Runs a trace from explicit asset-type descriptors (no map feature needed). */
  suspend fun trace(
    traceTypeName: String,
    startingLocations: List<Map<String, Any?>>,
  ): Map<String, Any?> {
    val network = this.network ?: return emptyTraceResult()
    val elements = startingLocations.mapNotNull { makeUtilityElement(network, it) }
    return runTrace(network, elements, traceTypeName, select = false)
  }

  /**
   * Queries a starting feature from [tableName] (by [whereClause]), traces from it, and selects
   * the result features on the map. Used for an interactive "trace from this device" flow.
   */
  suspend fun traceFromQuery(
    tableName: String,
    whereClause: String,
    traceTypeName: String,
  ): Map<String, Any?> {
    val network = this.network ?: return emptyTraceResult()
    val table = featureLayers[tableName]?.featureTable as? ServiceFeatureTable
      ?: return emptyTraceResult()
    val query = QueryParameters().apply {
      this.whereClause = whereClause
      maxFeatures = 1
    }
    val feature = table.queryFeatures(query).getOrThrow().firstOrNull() as? ArcGISFeature
      ?: return emptyTraceResult()
    val element = network.createElementOrNull(feature, null) ?: return emptyTraceResult()
    return runTrace(network, listOf(element), traceTypeName, select = true)
  }

  private suspend fun runTrace(
    network: UtilityNetwork,
    elements: List<UtilityElement>,
    traceTypeName: String,
    select: Boolean,
  ): Map<String, Any?> {
    if (elements.isEmpty()) return emptyTraceResult()
    val parameters = UtilityTraceParameters(utilityTraceType(traceTypeName), elements)
    val results = network.trace(parameters).getOrThrow()
    val found = results.filterIsInstance<UtilityElementTraceResult>().firstOrNull()?.elements
      ?: emptyList()
    if (select) selectElements(found)
    return mapOf(
      "elementCount" to found.size,
      "elements" to found.map { serializeUtilityElement(it) },
    )
  }

  /** Selects the trace-result features on their corresponding feature layers (best-effort). */
  private suspend fun selectElements(elements: List<UtilityElement>) {
    featureLayers.values.forEach { it.clearSelection() }
    elements.groupBy { it.networkSource.name }.forEach { (sourceName, group) ->
      val layer = featureLayers[sourceName] ?: return@forEach
      val query = QueryParameters().apply { objectIds.addAll(group.map { it.objectId }) }
      layer.selectFeatures(query, SelectionMode.New)
    }
  }

  private fun emptyTraceResult(): Map<String, Any?> = mapOf("elementCount" to 0, "elements" to emptyList<Any?>())
}

/** Resolves a JS descriptor (asset-type path + global id) to a [UtilityElement] via the definition. */
private fun makeUtilityElement(network: UtilityNetwork, d: Map<String, Any?>): UtilityElement? {
  val definition = network.definition ?: return null
  val sourceName = d["networkSource"] as? String ?: return null
  val groupName = d["assetGroup"] as? String ?: return null
  val typeName = d["assetType"] as? String ?: return null
  val globalIdStr = (d["globalId"] as? String)?.trim('{', '}') ?: return null
  val guid = Guid.createOrNull(globalIdStr) ?: return null
  val source = definition.getNetworkSource(sourceName) ?: return null
  val group = source.getAssetGroup(groupName) ?: return null
  val assetType = group.getAssetType(typeName) ?: return null
  return network.createElementOrNull(assetType, guid, null)
}

private fun serializeUtilityElement(element: UtilityElement): Map<String, Any?> = mapOf(
  "objectId" to element.objectId,
  "globalId" to element.globalId.toString(),
  "networkSource" to element.networkSource.name,
  "assetGroup" to element.assetGroup.name,
  "assetType" to element.assetType.name,
)

/** Maps the JS trace-type union to the native sealed [UtilityTraceType]. */
private fun utilityTraceType(name: String): UtilityTraceType = when (name) {
  "subnetwork" -> UtilityTraceType.Subnetwork
  "upstream" -> UtilityTraceType.Upstream
  "downstream" -> UtilityTraceType.Downstream
  "isolation" -> UtilityTraceType.Isolation
  "loops" -> UtilityTraceType.Loops
  "shortestPath" -> UtilityTraceType.ShortestPath
  else -> UtilityTraceType.Connected
}
