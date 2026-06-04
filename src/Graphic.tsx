import { useEffect, useRef } from 'react';

import type { GraphicProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type GraphicRef } from './ExpoArcgisModule';
import { useMapView } from './MapView';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/** Declarative point graphic. Draws itself on the nearest `<MapView>`'s graphics overlay. */
export function Graphic(props: GraphicProps) {
  const overlay = useMapView();
  const ref = useRef<GraphicRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.GraphicRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const graphic = ref.current!;
    overlay.addGraphic(graphic);
    return () => {
      overlay.removeGraphic(graphic);
      graphic.release();
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
