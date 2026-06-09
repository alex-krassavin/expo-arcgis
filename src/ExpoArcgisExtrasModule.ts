import { NativeModule, requireNativeModule } from 'expo';

import type { FeatureLayerProps } from './ExpoArcgis.types';
import type { FeatureLayerRef } from './ExpoArcgisModule';

/**
 * Third native module (`ExpoArcgisExtras`) hosting the heavier operational-layer SharedObject
 * classes — currently `FeatureLayerRef` — split out of `ExpoArcgisGeometry` so that no module's
 * native `definition()` exceeds the Android JVM 64 KB method-size limit. SharedObjects are global,
 * so a ref constructed here attaches to a `<MapView>` from the main module fine.
 */
declare class ExpoArcgisExtrasModule extends NativeModule {
  FeatureLayerRef: new (props: FeatureLayerProps) => FeatureLayerRef;
}

export default requireNativeModule<ExpoArcgisExtrasModule>('ExpoArcgisExtras');
