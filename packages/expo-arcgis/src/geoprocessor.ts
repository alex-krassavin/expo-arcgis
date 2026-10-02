import Module from './ExpoArcgisGeometryModule';
import type { JobRef } from './ExpoArcgisModule';
import type { GeoprocessingInput, GeoprocessingResult } from './ExpoArcgis.types';

/**
 * Server-side spatial analysis, mirroring `ArcGIS.GeoprocessingTask` (Swift) /
 * `com.arcgismaps.tasks.geoprocessing.GeoprocessingTask` (Kotlin). Runs a geoprocessing service
 * with typed inputs and returns the tool's outputs. Returns a `JobRef` — `await job.result()`,
 * observe `onProgress`, or `job.cancel()`; works for sync-execute and async-submit services alike.
 */
export const geoprocessor = {
  /** Runs the geoprocessing tool at `serviceUrl` with the given named, typed `inputs`. */
  execute: (
    serviceUrl: string,
    inputs: Record<string, GeoprocessingInput>
  ): Promise<JobRef<GeoprocessingResult>> => Module.executeGeoprocessing(serviceUrl, inputs),
};
