import { useEffect, useRef } from 'react';

import type { ViewshedProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type ViewshedRef } from './ExpoArcgisModule';
import { useAnalysisOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative exploratory viewshed — the area visible from an observer. Mirrors the native
 * `ExploratoryLocationViewshed`; draws itself on the nearest `<AnalysisOverlay>` (3D only).
 */
export function Viewshed(props: ViewshedProps) {
  const overlay = useAnalysisOverlay();
  const ref = useRef<ViewshedRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.ViewshedRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const analysis = ref.current!;
    overlay.addAnalysis(analysis);
    return () => {
      overlay.removeAnalysis(analysis);
      analysis.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useUpdateEffect(() => {
    const diffs = getPropsDiffs(prev, props);
    if (diffs.length === 0) return;
    const changed: Record<string, unknown> = {};
    diffs.forEach((key) => {
      changed[key] = props[key];
    });
    ref.current?.applyProps(changed);
  }, [props]);

  return null;
}
