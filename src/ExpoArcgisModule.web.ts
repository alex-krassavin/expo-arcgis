import { registerWebModule, NativeModule } from 'expo';

import type { MapProps } from './ExpoArcgis.types';

// ArcGIS native map rendering is not available on the web platform.
class ArcGISMapRef {
  applyProps(_changed: Partial<MapProps>): void {}
  release(): void {}
}

class ExpoArcgisModule extends NativeModule {
  ArcGISMapRef = ArcGISMapRef;
  setApiKey(_apiKey: string): void {}
}

export default registerWebModule(ExpoArcgisModule, 'ExpoArcgisModule');
