import Module from './ExpoArcgisGeometryModule';
import type { BasemapInfo, BasemapQuery, PortalItemInfo, PortalQuery } from './ExpoArcgis.types';

/**
 * Search a Portal and retrieve its configured basemaps, mirroring the native
 * `Portal` class (`com.arcgismaps.portal.Portal` / `ArcGIS.Portal`).
 *
 * All calls are anonymous — no authentication is required for public portals
 * (ArcGIS Online by default). Secured portals (requiring a login) are out of scope;
 * add a credential via `setServiceCredential` / `setTokenCredential` before calling
 * these functions if the portal demands authentication.
 *
 * The portal is loaded (`portal.load()` / `portal.load()`) before each query so that
 * organisation-specific settings (like custom basemaps) are available.
 */
export const portal = {
  /**
   * Searches the portal for items matching `query.query`, returning up to `query.max` results
   * (default 10). Uses the portal at `query.portalUrl` (default `https://www.arcgis.com`).
   *
   * @example
   * ```ts
   * const items = await portal.findItems({
   *   query: 'type:"Web Map" owner:esri',
   *   max: 20,
   * });
   * // items: PortalItemInfo[] — each has { id, title, type, snippet, owner, thumbnailUrl }
   * ```
   */
  findItems: (query: PortalQuery): Promise<PortalItemInfo[]> =>
    Module.portalFindItems(query),

  /**
   * Fetches the organisation basemaps configured for the portal at `params.portalUrl`
   * (default `https://www.arcgis.com`). Returns a flat list of `{ name, itemId }` records.
   * Pass `itemId` to `<Map portalItem={{ itemId }}>` to use a basemap in a map view.
   *
   * @example
   * ```ts
   * const basemaps = await portal.fetchBasemaps();
   * // basemaps: BasemapInfo[] — e.g. [{ name: 'World Topographic Map', itemId: '...' }, ...]
   * ```
   */
  fetchBasemaps: (params?: BasemapQuery): Promise<BasemapInfo[]> =>
    Module.portalFetchBasemaps(params ?? {}),
};
