import { useEffect, useRef } from 'react';

import type { LineOfSightProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type LineOfSightRef } from './ExpoArcgisModule';
import { useAnalysisOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative exploratory line of sight between an observer and a target. Mirrors the native
 * `ExploratoryLocationLineOfSight`; draws itself on the nearest `<AnalysisOverlay>` (3D only) and
 * reports the target's visibility via `onTargetVisibilityChange`.
 */
export function LineOfSight({ observer, target, onTargetVisibilityChange }: LineOfSightProps) {
  const overlay = useAnalysisOverlay();
  const ref = useRef<LineOfSightRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.LineOfSightRef({ observer, target });
  }

  const geometry = { observer, target };
  const prev = usePrevious(geometry);

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
    const diffs = getPropsDiffs(prev, geometry);
    if (diffs.length === 0) return;
    const changed: Record<string, unknown> = {};
    diffs.forEach((key) => {
      changed[key] = geometry[key];
    });
    ref.current?.applyProps(changed);
  }, [observer, target]);

  // Subscribe to the native target-visibility stream (mirrors <GeometryEditor>'s onGeometryChange).
  useEffect(() => {
    if (!onTargetVisibilityChange) return;
    const subscription = ref.current!.addListener('onTargetVisibilityChange', ({ visibility }) => {
      onTargetVisibilityChange(visibility);
    });
    return () => subscription.remove();
  }, [onTargetVisibilityChange]);

  return null;
}
