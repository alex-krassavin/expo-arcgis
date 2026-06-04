import { registerWebModule, NativeModule } from 'expo';

import type { MapProps, SceneProps } from './ExpoArcgis.types';

// ArcGIS native rendering is not available on the web platform.
class LayerRef {
  applyProps(_changed: Record<string, unknown>): void {}
  release(): void {}
}

class GraphicRef {
  applyProps(_changed: Record<string, unknown>): void {}
  release(): void {}
}

class GraphicsOverlayRef {
  addGraphic(_graphic: GraphicRef): void {}
  removeGraphic(_graphic: GraphicRef): void {}
  release(): void {}
}

class MapRef {
  applyProps(_changed: Partial<MapProps>): void {}
  addLayer(_layer: LayerRef): void {}
  removeLayer(_layer: LayerRef): void {}
  release(): void {}
}

class SceneRef {
  applyProps(_changed: Partial<SceneProps>): void {}
  addLayer(_layer: LayerRef): void {}
  removeLayer(_layer: LayerRef): void {}
  release(): void {}
}

class ExpoArcgisModule extends NativeModule {
  MapRef = MapRef;
  SceneRef = SceneRef;
  FeatureLayerRef = LayerRef;
  TiledLayerRef = LayerRef;
  GraphicsOverlayRef = GraphicsOverlayRef;
  GraphicRef = GraphicRef;
  setApiKey(_apiKey: string): void {}
}

export default registerWebModule(ExpoArcgisModule, 'ExpoArcgisModule');
