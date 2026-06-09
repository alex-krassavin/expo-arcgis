import ArcGIS
import Foundation

/// Free functions backing the JS `portal` namespace — search a Portal and fetch its basemaps.
/// Registered as `AsyncFunction`s in `ExpoArcgisGeometryModule`.
///
/// Both functions run anonymously (no auth). Authenticated portals would need a credential
/// already present in `ArcGISEnvironment.authenticationManager.arcGISCredentialStore`
/// (e.g. set via `setTokenCredential` / `setServiceCredential`). That is out of scope here.

enum PortalError: Error { case invalidPortalURL }

/// Serialises a `PortalItem` to the wire dict `{ id, title, type, snippet, owner, thumbnailUrl }`.
///
/// `PortalItem.id` is an `Item.ID?` whose `rawValue` is a `String`.
/// `PortalItem.typeName` is the human-readable type string (e.g. `"Web Map"`).
/// `thumbnail` is a `LoadableImage?`; we return its `url` (an absolute HTTPS URL on ArcGIS Online)
/// as a string — or `nil` when absent. The thumbnail is NOT loaded here (that would require an
/// extra async fetch per item); callers that need the bitmap should load the URL themselves.
private func portalItemToDict(_ item: PortalItem) -> [String: Any?] {
  let thumbnailUrl: String? = item.thumbnail.flatMap { loadableImage in
    // LoadableImage.url is available on iOS 17+ via the ArcGIS SDK; on 300.0 it is the remote URL.
    // We reflect on the object to extract the URI string without loading the image.
    // The SDK exposes no public `uri` property on LoadableImage in 300.0 — use the portal-item
    // convention: https://<portalHost>/sharing/rest/content/items/<id>/info/thumbnail
    // instead of trying to call a private accessor.
    guard let itemID = item.id?.rawValue, !itemID.isEmpty else { return nil }
    // Build the standard thumbnail URL from the portal's URL + item id.
    // This is the canonical ArcGIS REST API thumbnail path.
    let baseURL = item.portal.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    return "\(baseURL)/sharing/rest/content/items/\(itemID)/info/thumbnail"
  }
  return [
    "id": item.id?.rawValue ?? "",
    "title": item.title,
    "type": item.typeName,
    "snippet": item.snippet,
    "owner": item.owner,
    "thumbnailUrl": thumbnailUrl as Any?,
  ]
}

/// Searches the portal at `portalUrl` (default ArcGIS Online) with the given `query` string,
/// returning up to `max` results (default 10). The portal is loaded (authenticated as anonymous)
/// before the query.
///
/// Swift SDK signatures used:
///   - `Portal(url: URL, connection: Portal.Connection = .anonymous)`
///   - `portal.load()` — Loadable conformance; must be called before any query
///   - `portal.findItems(queryParameters: PortalQueryParameters) async throws -> PortalQueryResultSet<PortalItem>`
///   - `PortalQueryParameters(query: String, limit: Int = 10)`
func portalFindItems(_ params: [String: Any]) async throws -> [[String: Any?]] {
  let urlString = params["portalUrl"] as? String ?? "https://www.arcgis.com"
  guard let url = URL(string: urlString) else { throw PortalError.invalidPortalURL }
  let query = params["query"] as? String ?? ""
  let max = params["max"] as? Int ?? 10

  let portal = Portal(url: url, connection: .anonymous)
  try await portal.load()

  var queryParams = PortalQueryParameters(query: query, limit: max)
  queryParams.limit = max

  let resultSet = try await portal.findItems(queryParameters: queryParams)
  return resultSet.results.map { portalItemToDict($0) }
}

/// Fetches the organisation basemaps from the portal at `portalUrl` (default ArcGIS Online).
/// Returns `[{ name, itemId }]`. Each basemap's `item` is a `PortalItem`; the id comes from
/// `item.id?.rawValue`.
///
/// Swift SDK signatures used:
///   - `portal.basemaps` — `var basemaps: [Basemap] { get async throws }` (async computed property)
///   - `Basemap.name: String`
///   - `Basemap.item: Item?` — the underlying portal item (a `PortalItem` at runtime)
func portalFetchBasemaps(_ params: [String: Any]) async throws -> [[String: Any?]] {
  let urlString = params["portalUrl"] as? String ?? "https://www.arcgis.com"
  guard let url = URL(string: urlString) else { throw PortalError.invalidPortalURL }

  let portal = Portal(url: url, connection: .anonymous)
  try await portal.load()

  let basemaps = try await portal.basemaps
  return basemaps.map { basemap in
    let itemId: String? = (basemap.item as? PortalItem)?.id?.rawValue
    return ["name": basemap.name, "itemId": itemId as Any?]
  }
}
