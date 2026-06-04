import { useEffect, useRef } from 'react';

import type { TileLayerProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type LayerRef } from './ExpoArcgisModule';
import { useMap } from './Map';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/** Declarative operational `ArcGISTiledLayer`. Adds itself to the nearest `<Map>` and reconciles props. */
export function TileLayer(props: TileLayerProps) {
  const map = useMap();
  const ref = useRef<LayerRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisModule.TiledLayerRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const layer = ref.current!;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
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
