import { useEffect, useRef } from 'react';

import type { DistanceMeasurementProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type DistanceMeasurementRef } from './ExpoArcgisModule';
import { useAnalysisOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative exploratory distance measurement between two 3D points. Mirrors the native
 * `ExploratoryLocationDistanceMeasurement`; draws itself on the nearest `<AnalysisOverlay>`
 * (3D only) and reports the direct / horizontal / vertical distances via `onMeasurementChange`.
 */
export function DistanceMeasurement({
  startLocation,
  endLocation,
  onMeasurementChange,
}: DistanceMeasurementProps) {
  const overlay = useAnalysisOverlay();
  const ref = useRef<DistanceMeasurementRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.DistanceMeasurementRef({ startLocation, endLocation });
  }

  const geometry = { startLocation, endLocation };
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
  }, [startLocation, endLocation]);

  useEffect(() => {
    if (!onMeasurementChange) return;
    const subscription = ref.current!.addListener('onMeasurementChange', (measurement) =>
      onMeasurementChange(measurement)
    );
    return () => subscription.remove();
  }, [onMeasurementChange]);

  return null;
}
