import ExtrasModule from './ExpoArcgisExtrasModule';
import Module from './ExpoArcgisGeometryModule';
import type {
  RouteParameters,
  RouteResult,
  RouteStop,
  RouteTrackerHandle,
} from './ExpoArcgis.types';

/**
 * Routing between stops, mirroring `ArcGIS.RouteTask` (Swift) /
 * `com.arcgismaps.tasks.networkanalysis.RouteTask` (Kotlin). The call is asynchronous and runs
 * against the ArcGIS World Route Service by default (override with `params.routeServiceUrl`).
 * The World service requires an API key — set it via `<MapSettings>` / `setApiKey`.
 */
export const router = {
  /** Solves a route visiting `stops` in order (or optimally when `findBestSequence` is set). */
  solveRoute: (stops: RouteStop[], params?: RouteParameters): Promise<RouteResult> =>
    Module.solveRoute(stops, params ?? {}),

  /**
   * Solves a route and returns a turn-by-turn navigation tracker. Feed it device locations via
   * `trackLocation` (e.g. from `<MapView>`'s `onLocationChange`) to advance navigation.
   */
  createRouteTracker: (
    stops: RouteStop[],
    params?: RouteParameters
  ): Promise<RouteTrackerHandle> => ExtrasModule.createRouteTracker(stops, params ?? {}),
};
