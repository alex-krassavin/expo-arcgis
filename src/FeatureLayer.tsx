import { useEffect, useRef } from 'react';

import type { FeatureLayerProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type LayerRef } from './ExpoArcgisModule';
import { useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/** Declarative operational `FeatureLayer`. Adds itself to the nearest `<Map>` / `<Scene>`. */
export function FeatureLayer(props: FeatureLayerProps) {
  const model = useGeoModel();
  const ref = useRef<LayerRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.FeatureLayerRef(props);
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
      changed[key] = props[key];
    });
    ref.current?.applyProps(changed);
  }, [props]);

  return null;
}
