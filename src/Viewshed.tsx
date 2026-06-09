import { useEffect, useRef } from 'react';

import type { GeoElementViewshedProps, ViewshedProps } from './ExpoArcgis.types';
import ExpoArcgisModule, {
  type GeoElementViewshedRef,
  type GraphicRef,
  type ViewshedRef,
} from './ExpoArcgisModule';
import { useAnalysisOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative exploratory viewshed — the area visible from an observer.
 *
 * Two modes:
 * - **Location-based** (`ViewshedProps`): fixed observer point — mirrors the native
 *   `ExploratoryLocationViewshed`.
 * - **GeoElement-anchored** (`GeoElementViewshedProps + graphic`): observer follows a `<Graphic>`
 *   as it moves — mirrors the native `ExploratoryGeoElementViewshed`.
 *
 * Both modes draw on the nearest `<AnalysisOverlay>` (3D / `<SceneView>` only).
 */
export function Viewshed(
  props: ViewshedProps | (GeoElementViewshedProps & { graphic: GraphicRef })
) {
  const overlay = useAnalysisOverlay();
  const analysisRef = useRef<ViewshedRef | GeoElementViewshedRef | undefined>(undefined);

  if (!analysisRef.current) {
    if ('graphic' in props) {
      const { graphic, ...rest } = props;
      analysisRef.current = new ExpoArcgisModule.GeoElementViewshedRef(graphic, rest);
    } else {
      analysisRef.current = new ExpoArcgisModule.ViewshedRef(props);
    }
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const analysis = analysisRef.current!;
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
    // `graphic` is construction-only — skip it (remount to change the tracked graphic).
    const changed: Record<string, unknown> = {};
    diffs.forEach((key) => {
      if (key !== 'graphic') {
        changed[key] = (props as Record<string, unknown>)[key];
      }
    });
    if (Object.keys(changed).length > 0) {
      analysisRef.current?.applyProps(changed);
    }
  }, [props]);

  return null;
}
