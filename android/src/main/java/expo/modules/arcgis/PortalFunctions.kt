package expo.modules.arcgis

import com.arcgismaps.mapping.Basemap
import com.arcgismaps.mapping.PortalItem
import com.arcgismaps.portal.Portal
import com.arcgismaps.portal.PortalQueryParameters

/**
 * Free functions backing the JS `portal` namespace — search a Portal and fetch its basemaps.
 * Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.
 *
 * Both functions run anonymously (no auth). Authenticated portals would need a credential
 * already present in `ArcGISEnvironment.authenticationManager.arcGISCredentialStore`
 * (e.g. set via `setServiceCredential` / the auth namespace). That is out of scope here.
 */

/**
 * Serialises a [PortalItem] to the wire map `{ id, title, type, snippet, owner, thumbnailUrl }`.
 *
 * Kotlin SDK notes:
 *   - `PortalItem.itemId: String` — the item's portal id
 *   - `PortalItem.title: String` — inherited from `Item`
 *   - `PortalItem.typeName: String` — human-readable type string (e.g. `"Web Map"`)
 *   - `PortalItem.snippet: String` — inherited from `Item`
 *   - `PortalItem.owner: String`
 *   - `PortalItem.thumbnail: LoadableImage?` — has `getUri(): String?` (relative or absolute URL)
 *
 * Thumbnail handling: `LoadableImage.uri` may be a relative path (e.g.
 * `"thumbnail/thumbnail.png"`) or an absolute URL. We build the canonical ArcGIS REST
 * thumbnail URL from the portal URL + item id so callers always get an absolute URL.
 * We do NOT load the image here — that would require an extra async fetch per item;
 * callers that need the bitmap should load the URL themselves.
 */
private fun portalItemToMap(item: PortalItem): Map<String, Any?> {
  val portalUrl = item.portal.url.trimEnd('/')
  val thumbnailUrl = if (item.itemId.isNotEmpty()) {
    "$portalUrl/sharing/rest/content/items/${item.itemId}/info/thumbnail"
  } else {
    null
  }
  return mapOf(
    "id" to item.itemId,
    "title" to item.title,
    "type" to item.typeName,
    "snippet" to item.snippet,
    "owner" to item.owner,
    "thumbnailUrl" to thumbnailUrl,
  )
}

/**
 * Searches the portal at [portalUrl] (default ArcGIS Online) with the given [query] string,
 * returning up to [max] results (default 10).
 *
 * Kotlin SDK signatures used:
 *   - `Portal(url: String, connection: Portal.Connection)` — `Portal.Connection.Anonymous`
 *   - `portal.load(): Result<Unit>` — must be called before queries
 *   - `portal.findItems(PortalQueryParameters): Result<PortalQueryResultSet<PortalItem>>`
 *   - `PortalQueryParameters(query: String, boundingBox: Envelope?, limit: Int)`
 *     where the primary ctor is `(String, Envelope?, Int)` and `limit` defaults to 10.
 */
internal suspend fun portalFindItems(params: Map<String, Any?>): List<Map<String, Any?>> {
  val urlString = params["portalUrl"] as? String ?: "https://www.arcgis.com"
  val query = params["query"] as? String ?: ""
  val max = (params["max"] as? Number)?.toInt() ?: 10

  val portal = Portal(urlString, Portal.Connection.Anonymous)
  portal.load().getOrThrow()

  val queryParams = PortalQueryParameters(query, null, max)
  val resultSet = portal.findItems(queryParams).getOrThrow()
  return resultSet.results.map { portalItemToMap(it) }
}

/**
 * Fetches the organisation basemaps from the portal at [portalUrl] (default ArcGIS Online).
 * Returns `[{ name, itemId }]`.
 *
 * Kotlin SDK signatures used:
 *   - `portal.fetchBasemaps(): Result<List<Basemap>>`
 *   - `Basemap.name: String`
 *   - `Basemap.item: Item?` — cast to `PortalItem` to get the item id
 */
internal suspend fun portalFetchBasemaps(params: Map<String, Any?>): List<Map<String, Any?>> {
  val urlString = params["portalUrl"] as? String ?: "https://www.arcgis.com"

  val portal = Portal(urlString, Portal.Connection.Anonymous)
  portal.load().getOrThrow()

  val basemaps: List<Basemap> = portal.fetchBasemaps().getOrThrow()
  return basemaps.map { basemap ->
    val itemId = (basemap.item as? PortalItem)?.itemId
    mapOf("name" to basemap.name, "itemId" to itemId)
  }
}
