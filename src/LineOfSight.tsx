import { useEffect, useRef } from 'react';

import type { GeoElementLineOfSightProps, LineOfSightProps } from './ExpoArcgis.types';
import ExpoArcgisModule, {
  type GeoElementLineOfSightRef,
  type GraphicRef,
  type LineOfSightRef,
} from './ExpoArcgisModule';
import { useAnalysisOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';
import { detachQuietly } from './utils/detachQuietly';

/**
 * Declarative exploratory line of sight between an observer and a target.
 *
 * Two modes:
 * - **Location-based** (`LineOfSightProps`): fixed observer and target points — mirrors the native
 *   `ExploratoryLocationLineOfSight`.
 * - **GeoElement-anchored** (`GeoElementLineOfSightProps + observerGraphic + targetGraphic`): both
 *   endpoints follow `<Graphic>`s as they move — mirrors the native
 *   `ExploratoryGeoElementLineOfSight`.
 *
 * Both modes draw on the nearest `<AnalysisOverlay>` (3D / `<SceneView>` only) and report the
 * target's visibility via `onTargetVisibilityChange`.
 */
export function LineOfSight(
  props:
    | LineOfSightProps
    | (GeoElementLineOfSightProps & { observerGraphic: GraphicRef; targetGraphic: GraphicRef })
) {
  const overlay = useAnalysisOverlay();
  const analysisRef = useRef<LineOfSightRef | GeoElementLineOfSightRef | undefined>(undefined);

  if (!analysisRef.current) {
    if ('observerGraphic' in props) {
      analysisRef.current = new ExpoArcgisModule.GeoElementLineOfSightRef(
        props.observerGraphic,
        props.targetGraphic
      );
    } else {
      analysisRef.current = new ExpoArcgisModule.LineOfSightRef({
        observer: props.observer,
        target: props.target,
      });
    }
  }

  const isLocationBased = !('observerGraphic' in props);
  const geometry = isLocationBased
    ? { observer: (props as LineOfSightProps).observer, target: (props as LineOfSightProps).target }
    : undefined;
  const prev = usePrevious(geometry);

  useEffect(() => {
    const analysis = analysisRef.current!;
    overlay.addAnalysis(analysis);
    return () => {
      detachQuietly(() => overlay.removeAnalysis(analysis));
      analysis.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location-based only: propagate observer / target point changes.
  useUpdateEffect(() => {
    if (!geometry || !prev) return;
    const diffs = getPropsDiffs(prev, geometry);
    if (diffs.length === 0) return;
    const changed: Record<string, unknown> = {};
    diffs.forEach((key) => {
      changed[key] = geometry[key];
    });
    (analysisRef.current as LineOfSightRef)?.applyProps(changed);
  }, [geometry?.observer, geometry?.target]);

  // Subscribe to the native target-visibility stream.
  const { onTargetVisibilityChange } = props;
  useEffect(() => {
    if (!onTargetVisibilityChange) return;
    const subscription = analysisRef.current!.addListener(
      'onTargetVisibilityChange',
      ({ visibility }) => {
        onTargetVisibilityChange(visibility);
      }
    );
    return () => subscription.remove();
  }, [onTargetVisibilityChange]);

  return null;
}
