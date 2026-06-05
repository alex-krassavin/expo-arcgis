import Module from './ExpoArcgisGeometryModule';
import type {
  GeocodeParameters,
  GeocodeResult,
  PointGeometry,
  ReverseGeocodeParameters,
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
};
