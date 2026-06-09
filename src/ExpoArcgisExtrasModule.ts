import { NativeModule, requireNativeModule } from 'expo';

import type {
  FeatureLayerProps,
  Geometry,
  RouteParameters,
  RouteStop,
  RouteTrackerHandle,
  TileCacheSizeEstimate,
} from './ExpoArcgis.types';
import type { FeatureLayerRef } from './ExpoArcgisModule';

/**
 * Third native module (`ExpoArcgisExtras`) hosting the heavier operational-layer SharedObject
 * classes — currently `FeatureLayerRef` — split out of `ExpoArcgisGeometry` so that no module's
 * native `definition()` exceeds the Android JVM 64 KB method-size limit. SharedObjects are global,
 * so a ref constructed here attaches to a `<MapView>` from the main module fine.
 */
declare class ExpoArcgisExtrasModule extends NativeModule {
  FeatureLayerRef: new (props: FeatureLayerProps) => FeatureLayerRef;
  estimateTileCacheSize(
    tileServiceUrl: string,
    areaOfInterest: Geometry,
    options?: Record<string, unknown>
  ): Promise<TileCacheSizeEstimate>;
  createRouteTracker(stops: RouteStop[], params: RouteParameters): Promise<RouteTrackerHandle>;
  /**
   * Pre-generates a `TokenCredential` for the given service URL and adds it to the credential
   * store scoped to that URL. Pass `null` for `tokenExpirationMinutes` to use the server default.
   */
  setServiceCredential(
    serviceUrl: string,
    username: string,
    password: string,
    tokenExpirationMinutes: number | null
  ): Promise<void>;
}

export default requireNativeModule<ExpoArcgisExtrasModule>('ExpoArcgisExtras');
