import Module from './ExpoArcgisGeometryModule';
import type { GeoprocessingInput, GeoprocessingResult } from './ExpoArcgis.types';

/**
 * Server-side spatial analysis, mirroring `ArcGIS.GeoprocessingTask` (Swift) /
 * `com.arcgismaps.tasks.geoprocessing.GeoprocessingTask` (Kotlin). Runs a geoprocessing service
 * with typed inputs and returns the tool's outputs. Asynchronous (submits a job and awaits the
 * result); works for both synchronous-execute and asynchronous-submit services.
 */
export const geoprocessor = {
  /** Runs the geoprocessing tool at `serviceUrl` with the given named, typed `inputs`. */
  execute: (
    serviceUrl: string,
    inputs: Record<string, GeoprocessingInput>
  ): Promise<GeoprocessingResult> => Module.executeGeoprocessing(serviceUrl, inputs),
};
