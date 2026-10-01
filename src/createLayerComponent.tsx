import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { LayerRef } from './ExpoArcgisModule';
import { useGeoModelFor } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';
import { detachQuietly } from './utils/detachQuietly';

/**
 * Builds a declarative operational-layer component from a native `LayerRef` factory.
 * Mirrors `<TileLayer>` / `<MapImageLayer>`: creates the ref once, attaches it to the nearest
 * `<Map>` / `<Scene>` via `useGeoModel`, reconciles prop changes via `applyProps`, and forwards the
 * native ref (typed `H`) so a layer's inspection/query methods are callable through a `ref`.
 *
 * `name` is the component's public name. It becomes the `displayName`, so React's component stacks
 * and DevTools say `VectorTileLayer` instead of the shared inner `Layer`, and it names the
 * component in the error when it is used outside a `<Map>` / `<Scene>`.
 */
export function createLayerComponent<P extends object, H = unknown>(
  name: string,
  makeRef: (props: P) => LayerRef
) {
  const Component = forwardRef<H, P>(function Layer(rawProps, handle) {
    // forwardRef types props as `PropsWithoutRef<P>`; our `P` has no ref prop, so treat it as `P`.
    const props = rawProps as P;
    const model = useGeoModelFor(name);
    const ref = useRef<LayerRef | undefined>(undefined);
    if (!ref.current) {
      ref.current = makeRef(props);
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
        changed[key as string] = props[key];
      });
      ref.current?.applyProps(changed);
    }, [props]);

    // Expose the native ref so layers with extra methods (e.g. KmlLayer.getNodes) are callable.
    useImperativeHandle(handle, () => ref.current as H, []);

    return null;
  });
  Component.displayName = name;
  return Component;
}
