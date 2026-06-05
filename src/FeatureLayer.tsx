import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { FeatureLayerHandle, FeatureLayerProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type FeatureLayerRef } from './ExpoArcgisModule';
import { useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative operational `FeatureLayer`. Adds itself to the nearest `<Map>` / `<Scene>`, and
 * exposes async queries through a `ref` — `queryFeatures` / `queryFeatureCount` / `queryExtent`.
 */
export const FeatureLayer = forwardRef<FeatureLayerHandle, FeatureLayerProps>(
  function FeatureLayer(props, handle) {
    const model = useGeoModel();
    const ref = useRef<FeatureLayerRef | undefined>(undefined);
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

    useImperativeHandle(
      handle,
      () => ({
        queryFeatures: (query = {}) => ref.current!.queryFeatures(query),
        queryFeatureCount: (query = {}) => ref.current!.queryFeatureCount(query),
        queryExtent: (query = {}) => ref.current!.queryExtent(query),
      }),
      []
    );

    return null;
  }
);
