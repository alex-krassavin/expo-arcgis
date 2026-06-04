import { createContext, useContext } from 'react';

import type { GeoModelRef, GraphicsOverlayRef } from './ExpoArcgisModule';

/**
 * The nearest geo model — a `<Map>` or `<Scene>`. Operational layers attach here.
 * Both `Map` and `Scene` provide this context, so React's nearest-provider rule picks the
 * right parent automatically (a layer inside a `<Scene>` gets the scene, etc.).
 */
export const GeoModelContext = createContext<GeoModelRef | undefined>(undefined);

export function useGeoModel(): GeoModelRef {
  const model = useContext(GeoModelContext);
  if (!model) {
    throw new Error('This component must be used within a <Map> or <Scene>.');
  }
  return model;
}

/** Lets a `<GraphicsOverlay>` register itself with the nearest `<MapView>` / `<SceneView>`. */
export type GraphicsOverlayHost = {
  add(overlay: GraphicsOverlayRef): void;
  remove(overlay: GraphicsOverlayRef): void;
};

/** The nearest geo view — a `<MapView>` or `<SceneView>`. Graphics overlays attach here. */
export const GeoViewContext = createContext<GraphicsOverlayHost | undefined>(undefined);

export function useGeoView(): GraphicsOverlayHost {
  const host = useContext(GeoViewContext);
  if (!host) {
    throw new Error('<GraphicsOverlay> must be used within a <MapView> or <SceneView>.');
  }
  return host;
}

/** The nearest `<GraphicsOverlay>`. Graphics attach here. */
export const GraphicsOverlayContext = createContext<GraphicsOverlayRef | undefined>(undefined);

export function useGraphicsOverlay(): GraphicsOverlayRef {
  const overlay = useContext(GraphicsOverlayContext);
  if (!overlay) {
    throw new Error('<Graphic> must be used within a <GraphicsOverlay>.');
  }
  return overlay;
}
