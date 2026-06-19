import { useEffect, useRef, type PropsWithChildren } from 'react';

import type { AnalysisOverlayProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type AnalysisOverlayRef } from './ExpoArcgisModule';
import { AnalysisOverlayContext, useGeoView } from './contexts';
import { detachQuietly } from './utils/detachQuietly';

/**
 * Declarative analysis overlay. Mirrors the native `AnalysisOverlay` — a `<SceneView>` can hold
 * several. Registers itself with the nearest `<SceneView>` and hosts `<Viewshed>` / `<LineOfSight>`
 * children. (Visual analyses are 3D only; inside a `<MapView>` this is a no-op.)
 */
export function AnalysisOverlay({ visible, children }: PropsWithChildren<AnalysisOverlayProps>) {
  const view = useGeoView();
  const ref = useRef<AnalysisOverlayRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.AnalysisOverlayRef();
  }

  useEffect(() => {
    const overlay = ref.current!;
    view.addAnalysisOverlay(overlay);
    return () => {
      detachQuietly(() => view.removeAnalysisOverlay(overlay));
      overlay.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply visibility on mount and whenever it changes.
  useEffect(() => {
    ref.current?.setVisible(visible ?? true);
  }, [visible]);

  return (
    <AnalysisOverlayContext.Provider value={ref.current}>{children}</AnalysisOverlayContext.Provider>
  );
}
