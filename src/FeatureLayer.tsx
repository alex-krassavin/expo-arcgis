import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { FeatureLayerHandle, FeatureLayerProps } from './ExpoArcgis.types';
import ExpoArcgisExtrasModule from './ExpoArcgisExtrasModule';
import type { FeatureLayerRef } from './ExpoArcgisModule';
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
      ref.current = new ExpoArcgisExtrasModule.FeatureLayerRef(props);
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

    // The native ref already exposes the query methods (typed to match FeatureLayerHandle), so
    // hand it over directly — it's created synchronously in render, so it's always set here.
    useImperativeHandle(handle, () => ref.current!, []);

    return null;
  }
);
