import Module from './ExpoArcgisGeometryModule';
import type { ServiceAreaResult, ServiceAreaSolveParams } from './ExpoArcgis.types';

/**
 * Service-area analysis, mirroring `ArcGIS.ServiceAreaTask` (Swift) /
 * `com.arcgismaps.tasks.networkanalysis.ServiceAreaTask` (Kotlin). Computes reachable-area polygons
 * from one or more facility locations using a network analysis service.
 */
export const serviceArea = {
  /**
   * Solves service areas for `facilities` using the given `serviceUrl`, returning one polygon ring
   * per facility per cutoff value. Pass `cutoffs` to override the service's default impedance
   * cutoffs (e.g. `[5, 10, 15]` for 5-, 10-, and 15-minute drive times).
   */
  solve: (params: ServiceAreaSolveParams): Promise<ServiceAreaResult> =>
    Module.serviceAreaSolve(params),
};
