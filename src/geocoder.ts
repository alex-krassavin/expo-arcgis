import Module from './ExpoArcgisGeometryModule';
import type {
  GeocodeParameters,
  GeocodeResult,
  PointGeometry,
  ReverseGeocodeParameters,
  SuggestParameters,
  SuggestResult,
} from './ExpoArcgis.types';

/**
 * Address ↔ coordinates search, mirroring `ArcGIS.LocatorTask` (Swift) /
 * `com.arcgismaps.tasks.geocode.LocatorTask` (Kotlin). Every call is asynchronous and runs
 * against the ArcGIS World Geocoding Service by default (override with `params.locatorUrl`).
 * The World service requires an API key — set it via `<MapSettings>` / `setApiKey`.
 */
export const geocoder = {
  /** Geocodes an address or place name into a list of matches. */
  geocode: (searchText: string, params?: GeocodeParameters): Promise<GeocodeResult[]> =>
    Module.geocode(searchText, params ?? {}),

  /** Reverse-geocodes a point into nearby addresses / places. */
  reverseGeocode: (point: PointGeometry, params?: ReverseGeocodeParameters): Promise<GeocodeResult[]> =>
    Module.reverseGeocode(point, params ?? {}),

  /** Returns autocomplete suggestions for a partial search; each result carries a `suggestionId`. */
  suggest: (searchText: string, params?: SuggestParameters): Promise<SuggestResult[]> =>
    Module.suggest(searchText, params ?? {}),

  /**
   * Geocodes a suggestion chosen from a prior `suggest` call, using the native SDK's precise
   * `geocode(forSuggestResult:)` overload — avoids a text re-search and returns the exact match.
   *
   * @param suggestionId The `suggestionId` from a `SuggestResult` returned by `suggest`.
   * @param params Optional params; use `locatorUrl` only if it differs from the one used in
   *   the `suggest` call (the registry already stores the original URL).
   */
  geocodeSuggestion: (suggestionId: number, params?: { locatorUrl?: string }): Promise<GeocodeResult[]> =>
    Module.geocodeSuggestion(suggestionId, params ?? {}),
};
