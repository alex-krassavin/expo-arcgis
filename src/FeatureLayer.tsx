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
    // An externally-provided `layer` (e.g. from a geodatabase/version) is owned by its producer, so
    // it's used as-is and never released here; otherwise build one from `url` / `source`.
    const isExternal = useRef(props.layer != null);
    if (!ref.current) {
      ref.current =
        (props.layer as unknown as FeatureLayerRef) ??
        new ExpoArcgisExtrasModule.FeatureLayerRef(props);
    }

    const prev = usePrevious(props);

    useEffect(() => {
      const layer = ref.current!;
      model.addLayer(layer);
      return () => {
        model.removeLayer(layer);
        if (!isExternal.current) layer.release();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useUpdateEffect(() => {
      const diffs = getPropsDiffs(prev, props);
      if (diffs.length === 0) return;
      const changed: Record<string, unknown> = {};
      diffs.forEach((key) => {
        // `layer` is the ref itself (construction-only), not a native prop to apply.
        if (key !== 'layer') changed[key] = props[key];
      });
      if (Object.keys(changed).length > 0) ref.current?.applyProps(changed);
    }, [props]);

    // The native ref already exposes the query methods (typed to match FeatureLayerHandle), so
    // hand it over directly — it's created synchronously in render, so it's always set here.
    useImperativeHandle(handle, () => ref.current!, []);

    return null;
  }
);
