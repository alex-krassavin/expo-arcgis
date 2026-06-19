import { useEffect, useRef } from 'react';

import type { MapImageLayerProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type LayerRef } from './ExpoArcgisModule';
import { useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';
import { detachQuietly } from './utils/detachQuietly';

/** Declarative operational `ArcGISMapImageLayer`. Adds itself to the nearest `<Map>` / `<Scene>`. */
export function MapImageLayer(props: MapImageLayerProps) {
  const model = useGeoModel();
  const ref = useRef<LayerRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.MapImageLayerRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const layer = ref.current!;
    model.addLayer(layer);
    return () => {
      detachQuietly(() => model.removeLayer(layer));
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
