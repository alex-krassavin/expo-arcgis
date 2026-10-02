import { useEffect, useRef, type PropsWithChildren } from 'react';

import type { MapProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type MapRef } from './ExpoArcgisModule';
import { GeoModelContext } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative `ArcGISMap` model. Creates a native map SharedObject once, reconciles prop changes
 * into it, and exposes it (as a geo model) to descendant views and layers.
 */
export function Map({ children, ...props }: PropsWithChildren<MapProps>) {
  // Create the native map exactly once (creating per-render would leak native objects).
  const ref = useRef<MapRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.MapRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const map = ref.current;
    return () => map?.release();
  }, []);

  useUpdateEffect(() => {
    const diffs = getPropsDiffs(prev, props);
    if (diffs.length === 0) return;
    const changed: Partial<MapProps> = {};
    diffs.forEach((key) => {
      (changed as Record<string, unknown>)[key] = props[key];
    });
    ref.current?.applyProps(changed);
  }, [props]);

  return <GeoModelContext.Provider value={ref.current}>{children}</GeoModelContext.Provider>;
}
