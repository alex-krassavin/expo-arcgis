import { useEffect, useRef, type PropsWithChildren } from 'react';

import ExpoArcgisModule, { type GraphicsOverlayRef } from './ExpoArcgisModule';
import { GraphicsOverlayContext, useGeoView } from './contexts';

/**
 * Declarative graphics overlay. Mirrors the native `GraphicsOverlay` — a view can hold several.
 * Registers itself with the nearest `<MapView>` / `<SceneView>` and hosts `<Graphic>` children.
 */
export function GraphicsOverlay({ children }: PropsWithChildren) {
  const view = useGeoView();
  const ref = useRef<GraphicsOverlayRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.GraphicsOverlayRef();
  }

  useEffect(() => {
    const overlay = ref.current!;
    view.add(overlay);
    return () => {
      view.remove(overlay);
      overlay.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GraphicsOverlayContext.Provider value={ref.current}>{children}</GraphicsOverlayContext.Provider>
  );
}
