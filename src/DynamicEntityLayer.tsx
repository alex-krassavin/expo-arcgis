import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type {
  ConnectionStatus,
  DynamicEntityChange,
  DynamicEntityLayerHandle,
  DynamicEntityLayerProps,
} from './ExpoArcgis.types';
import ExpoArcgisModule, { type DynamicEntityLayerRef } from './ExpoArcgisModule';
import { useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative real-time `DynamicEntityLayer`. Adds itself to the nearest `<Map>` / `<Scene>`, shows
 * live moving entities from a `streamServiceUrl` (or a `customSource` you feed via the ref), reports
 * connection state through `onConnectionStatusChange`, and exposes `queryDynamicEntities` /
 * `pushObservation` through a `ref`.
 */
export const DynamicEntityLayer = forwardRef<DynamicEntityLayerHandle, DynamicEntityLayerProps>(
  function DynamicEntityLayer({ onConnectionStatusChange, onDynamicEntityChange, ...layerProps }, handle) {
    const model = useGeoModel();
    const ref = useRef<DynamicEntityLayerRef | undefined>(undefined);
    if (!ref.current) {
      ref.current = new ExpoArcgisModule.DynamicEntityLayerRef(layerProps);
    }

    const prev = usePrevious(layerProps);

    useEffect(() => {
      const layer = ref.current!;
      model.addLayer(layer);
      return () => {
        model.removeLayer(layer);
        layer.release();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The connection-status callback is wired as an event listener (functions can't cross as props).
    useEffect(() => {
      if (!onConnectionStatusChange) return;
      const sub = ref.current!.addListener(
        'onConnectionStatusChange',
        (event: { status: ConnectionStatus }) => onConnectionStatusChange(event.status)
      );
      return () => sub.remove();
    }, [onConnectionStatusChange]);

    // The entity-change callback is wired as an event listener.
    useEffect(() => {
      if (!onDynamicEntityChange) return;
      const sub = ref.current!.addListener(
        'onDynamicEntityChange',
        (event: DynamicEntityChange) => onDynamicEntityChange({ nativeEvent: event })
      );
      return () => sub.remove();
    }, [onDynamicEntityChange]);

    useUpdateEffect(() => {
      const diffs = getPropsDiffs(prev, layerProps);
      if (diffs.length === 0) return;
      const changed: Record<string, unknown> = {};
      diffs.forEach((key) => {
        changed[key as string] = (layerProps as Record<string, unknown>)[key as string];
      });
      ref.current?.applyProps(changed);
    }, [layerProps]);

    // The native ref exposes queryDynamicEntities / pushObservation — hand it over directly.
    useImperativeHandle(handle, () => ref.current!, []);

    return null;
  }
);
