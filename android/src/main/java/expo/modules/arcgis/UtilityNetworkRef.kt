package expo.modules.arcgis

import com.arcgismaps.Guid
import com.arcgismaps.data.ServiceGeodatabase
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

  /** Builds the network from the service geodatabase, loads it, adds it to the map, returns its name. */
  suspend fun load(mapRef: MapRef): String {
    val serviceGeodatabase = ServiceGeodatabase(serviceGeodatabaseUrl)
    serviceGeodatabase.load().getOrThrow()
    val network = UtilityNetwork(serviceGeodatabase)
    network.load().getOrThrow()
    this.network = network
    mapRef.map.utilityNetworks.add(network)
    return network.name
  }

  /** Runs a trace from the given starting-location descriptors and serializes the element results. */
  suspend fun trace(
    traceTypeName: String,
    startingLocations: List<Map<String, Any?>>,
  ): Map<String, Any?> {
    val network = this.network
      ?: return mapOf("elementCount" to 0, "elements" to emptyList<Any?>())
    val elements = startingLocations.mapNotNull { makeUtilityElement(network, it) }
    val parameters = UtilityTraceParameters(utilityTraceType(traceTypeName), elements)
    val results = network.trace(parameters).getOrThrow()
    val found = results.filterIsInstance<UtilityElementTraceResult>().firstOrNull()?.elements
      ?: emptyList()
    return mapOf(
      "elementCount" to found.size,
      "elements" to found.map { serializeUtilityElement(it) },
    )
  }
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
