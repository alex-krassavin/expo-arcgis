import { useEffect, useRef } from 'react';

import type { LayerRef } from './ExpoArcgisModule';
import { useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Builds a declarative operational-layer component from a native `LayerRef` factory.
 * Mirrors `<TileLayer>` / `<MapImageLayer>`: creates the ref once, attaches it to the nearest
 * `<Map>` / `<Scene>` via `useGeoModel`, and reconciles prop changes via `applyProps`.
 */
export function createLayerComponent<P extends object>(makeRef: (props: P) => LayerRef) {
  return function Layer(props: P) {
    const model = useGeoModel();
    const ref = useRef<LayerRef | undefined>(undefined);
    if (!ref.current) {
      ref.current = makeRef(props);
    }

    const prev = usePrevious(props);

    useEffect(() => {
      const layer = ref.current!;
      model.addLayer(layer);
      return () => {
        model.removeLayer(layer);
        layer.release();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useUpdateEffect(() => {
      const diffs = getPropsDiffs(prev, props);
      if (diffs.length === 0) return;
      const changed: Record<string, unknown> = {};
      diffs.forEach((key) => {
        changed[key as string] = props[key];
      });
      ref.current?.applyProps(changed);
    }, [props]);

    return null;
  };
}
