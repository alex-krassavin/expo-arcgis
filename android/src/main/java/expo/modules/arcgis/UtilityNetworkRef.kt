package expo.modules.arcgis

import com.arcgismaps.Guid
import com.arcgismaps.data.ArcGISFeature
import com.arcgismaps.data.QueryParameters
import com.arcgismaps.data.ServiceFeatureTable
import com.arcgismaps.data.ServiceGeodatabase
import com.arcgismaps.geometry.Envelope
import com.arcgismaps.mapping.layers.FeatureLayer
import com.arcgismaps.mapping.layers.SelectionMode
import com.arcgismaps.utilitynetworks.UtilityAssociationType
import com.arcgismaps.utilitynetworks.UtilityElement
import com.arcgismaps.utilitynetworks.UtilityElementTraceResult
import com.arcgismaps.utilitynetworks.UtilityNamedTraceConfiguration
import com.arcgismaps.utilitynetworks.UtilityNamedTraceConfigurationQueryParameters
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
  private val appCtx = appContext
  private var network: UtilityNetwork? = null

  /** Operational feature layers created for the network's tables, keyed by table name (for selection). */
  private val featureLayers = mutableMapOf<String, FeatureLayer>()

  /** Named trace configurations queried from the network, keyed by global id (for trace-by-config). */
  private val namedConfigurations = mutableMapOf<String, UtilityNamedTraceConfiguration>()

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
  /** Returns metadata about the loaded network — the names of its network sources. */
  fun describeNetwork(): Map<String, Any?> {
    val sources = network?.definition?.networkSources?.value?.map { it.name } ?: emptyList()
    return mapOf("networkSources" to sources)
  }

  suspend fun trace(
    traceTypeName: String,
    startingLocations: List<Map<String, Any?>>,
  ): Map<String, Any?> {
    val network = this.network ?: return emptyTraceResult()
    val elements = startingLocations.mapNotNull { makeUtilityElement(network, it) }
    if (elements.isEmpty()) return emptyTraceResult()
    val parameters = UtilityTraceParameters(utilityTraceType(traceTypeName), elements)
    return runTrace(network, parameters, select = false)
  }

  /** Queries a starting feature from [tableName] (by [whereClause]), traces by type, selects results. */
  suspend fun traceFromQuery(
    tableName: String,
    whereClause: String,
    traceTypeName: String,
  ): Map<String, Any?> {
    val network = this.network ?: return emptyTraceResult()
    val element = queryStartElement(network, tableName, whereClause) ?: return emptyTraceResult()
    val parameters = UtilityTraceParameters(utilityTraceType(traceTypeName), listOf(element))
    return runTrace(network, parameters, select = true)
  }

  /** Lists the network's named trace configurations (caches them for [traceWithConfiguration]). */
  suspend fun queryNamedTraceConfigurations(): List<Map<String, Any?>> {
    val network = this.network ?: return emptyList()
    val configs = network
      .queryNamedTraceConfigurations(UtilityNamedTraceConfigurationQueryParameters())
      .getOrThrow()
    configs.forEach { namedConfigurations[it.globalId.toString()] = it }
    return configs.map { mapOf("name" to it.name, "globalId" to it.globalId.toString()) }
  }

  /** Traces using a named configuration (by global id), from a feature queried from [tableName]. */
  suspend fun traceWithConfiguration(
    configGlobalId: String,
    tableName: String,
    whereClause: String,
  ): Map<String, Any?> {
    val network = this.network ?: return emptyTraceResult()
    val config = namedConfigurations[configGlobalId] ?: return emptyTraceResult()
    val element = queryStartElement(network, tableName, whereClause) ?: return emptyTraceResult()
    val parameters = UtilityTraceParameters(config, listOf(element))
    return runTrace(network, parameters, select = true)
  }

  /** Returns the associations (connectivity / containment / attachment) of a queried element. */
  suspend fun associations(tableName: String, whereClause: String): Map<String, Any?> {
    val network = this.network ?: return mapOf("count" to 0, "kinds" to emptyList<Any?>())
    val element = queryStartElement(network, tableName, whereClause)
      ?: return mapOf("count" to 0, "kinds" to emptyList<Any?>())
    val associations = network.getAssociations(element, null).getOrThrow()
    val kinds = associations.map { associationKindName(it.associationType) }.toSet().toList()
    return mapOf("count" to associations.size, "kinds" to kinds)
  }

  /** Returns the terminal configurations defined in the network — each with its name and terminals. */
  fun getTerminalConfigurations(): List<Map<String, Any?>> {
    val definition = network?.definition ?: return emptyList()
    return definition.terminalConfigurations.map { config ->
      mapOf(
        "name" to config.name,
        "terminals" to config.terminals.map { t ->
          mapOf("name" to t.name, "isUpstream" to t.isUpstreamTerminal)
        },
      )
    }
  }

  /** Returns the network's topology state — dirty areas, errors, and whether topology is enabled. */
  suspend fun getState(): Map<String, Any?> {
    val network = this.network ?: return emptyMap()
    val state = network.getState().getOrThrow()
    return mapOf(
      "hasDirtyAreas" to state.hasDirtyAreas,
      "hasErrors" to state.hasErrors,
      "networkTopologyEnabled" to state.isNetworkTopologyEnabled,
    )
  }

  /** Validates the network topology over `extent` (an envelope); returns a job to track / cancel. */
  fun validateNetworkTopology(extent: Map<String, Any?>): JobRef? {
    val network = this.network ?: return null
    val envelope = geometryFromDict(extent) as? Envelope ?: return null
    val job = network.validateNetworkTopology(envelope)
    return JobRef(appCtx, job) {
      job.result().getOrThrow()
      mapOf("validated" to true)
    }
  }

  // region Helpers

  private suspend fun queryStartElement(
    network: UtilityNetwork,
    tableName: String,
    whereClause: String,
  ): UtilityElement? {
    val table = featureLayers[tableName]?.featureTable as? ServiceFeatureTable ?: return null
    val query = QueryParameters().apply {
      this.whereClause = whereClause
      maxFeatures = 1
    }
    val feature = table.queryFeatures(query).getOrThrow().firstOrNull() as? ArcGISFeature ?: return null
    return network.createElementOrNull(feature, null)
  }

  private suspend fun runTrace(
    network: UtilityNetwork,
    parameters: UtilityTraceParameters,
    select: Boolean,
  ): Map<String, Any?> {
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

/** Maps a [UtilityAssociationType] to a short JS string. */
private fun associationKindName(type: UtilityAssociationType): String = when (type) {
  is UtilityAssociationType.Connectivity -> "connectivity"
  is UtilityAssociationType.Containment -> "containment"
  is UtilityAssociationType.Attachment -> "attachment"
  else -> "junctionEdge"
}
