import { useEffect, useRef, type PropsWithChildren } from 'react';

import type { Renderer } from './ExpoArcgis.types';
import ExpoArcgisModule, { type GraphicsOverlayRef } from './ExpoArcgisModule';
import { GraphicsOverlayContext, useGeoView } from './contexts';
import { detachQuietly } from './utils/detachQuietly';

export type GraphicsOverlayProps = {
  /** Renderer applied to graphics that set no `symbol` of their own. */
  renderer?: Renderer;
};

/**
 * Declarative graphics overlay. Mirrors the native `GraphicsOverlay` — a view can hold several.
 * Registers itself with the nearest `<MapView>` / `<SceneView>` and hosts `<Graphic>` children.
 */
export function GraphicsOverlay({ renderer, children }: PropsWithChildren<GraphicsOverlayProps>) {
  const view = useGeoView();
  const ref = useRef<GraphicsOverlayRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.GraphicsOverlayRef();
  }

  useEffect(() => {
    const overlay = ref.current!;
    view.add(overlay);
    return () => {
      detachQuietly(() => view.remove(overlay));
      overlay.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply the renderer on mount and whenever it changes (pass a stable/memoized value).
  useEffect(() => {
    ref.current?.setRenderer(renderer ?? null);
  }, [renderer]);

  return (
    <GraphicsOverlayContext.Provider value={ref.current}>{children}</GraphicsOverlayContext.Provider>
  );
}
