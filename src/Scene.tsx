import { useEffect, useRef, type PropsWithChildren } from 'react';

import type { SceneProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type SceneRef } from './ExpoArcgisModule';
import { GeoModelContext } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative 3D scene model (mirrors `ArcGISScene` / `Scene`). Creates a native scene SharedObject
 * once, reconciles prop changes, and exposes it (as a geo model) to descendant views and layers.
 */
export function Scene({ children, ...props }: PropsWithChildren<SceneProps>) {
  const ref = useRef<SceneRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.SceneRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const scene = ref.current;
    return () => scene?.release();
  }, []);

  useUpdateEffect(() => {
    const diffs = getPropsDiffs(prev, props);
    if (diffs.length === 0) return;
    const changed: Partial<SceneProps> = {};
    diffs.forEach((key) => {
      (changed as Record<string, unknown>)[key] = props[key];
    });
    ref.current?.applyProps(changed);
  }, [props]);

  return <GeoModelContext.Provider value={ref.current}>{children}</GeoModelContext.Provider>;
}
