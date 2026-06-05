import Module from './ExpoArcgisGeometryModule';
import type { RouteParameters, RouteResult, RouteStop } from './ExpoArcgis.types';

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
};
