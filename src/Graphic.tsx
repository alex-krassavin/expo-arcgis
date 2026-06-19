import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { GraphicProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type GraphicRef } from './ExpoArcgisModule';
import { useGraphicsOverlay } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';
import { detachQuietly } from './utils/detachQuietly';

/**
 * Declarative point graphic. Draws itself on the nearest `<GraphicsOverlay>`. Forwards its native
 * `GraphicRef` so the graphic can be handed to a GeoElement-anchored analysis — e.g.
 * `<Viewshed graphic={ref}>` / `<LineOfSight observerGraphic={ref}>`.
 */
export const Graphic = forwardRef<GraphicRef, GraphicProps>(function Graphic(props, fwdRef) {
  const overlay = useGraphicsOverlay();
  const ref = useRef<GraphicRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.GraphicRef(props);
  }
  useImperativeHandle(fwdRef, () => ref.current!, []);

  const prev = usePrevious(props);

  useEffect(() => {
    const graphic = ref.current!;
    overlay.addGraphic(graphic);
    return () => {
      detachQuietly(() => overlay.removeGraphic(graphic));
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
});
