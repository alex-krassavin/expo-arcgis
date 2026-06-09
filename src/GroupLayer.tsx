import { useEffect, useRef, type PropsWithChildren } from 'react';

import type { LayerProps } from './ExpoArcgis.types';
import ExpoArcgisGeometryModule from './ExpoArcgisGeometryModule';
import type { GeoModelRef, GroupLayerRef } from './ExpoArcgisModule';
import { GeoModelContext, useGeoModel } from './contexts';
import { usePrevious } from './hooks/usePrevious';
import { useUpdateEffect } from './hooks/useUpdateEffect';
import { getPropsDiffs } from './utils/getPropsDiffs';

/**
 * Declarative `GroupLayer` — a container that groups its child layers as a single unit on the
 * nearest `<Map>` / `<Scene>`. Child layers (`<FeatureLayer>`, `<TileLayer>`, …, even nested
 * `<GroupLayer>`s) declared inside add themselves to the group instead of the map.
 */
export function GroupLayer({ children, ...props }: PropsWithChildren<LayerProps>) {
  const model = useGeoModel();
  const ref = useRef<GroupLayerRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExpoArcgisGeometryModule.GroupLayerRef(props);
  }

  const prev = usePrevious(props);

  useEffect(() => {
    const group = ref.current!;
    model.addLayer(group);
    return () => {
      model.removeLayer(group);
      group.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useUpdateEffect(() => {
    const diffs = getPropsDiffs(prev, props);
    if (diffs.length === 0) return;
    const changed: Record<string, unknown> = {};
    diffs.forEach((key) => {
      changed[key as string] = (props as Record<string, unknown>)[key as string];
    });
    ref.current?.applyProps(changed);
  }, [props]);

  // The group is itself a layer host — children consume it through the same GeoModel context and
  // attach to the group rather than the map.
  return (
    <GeoModelContext.Provider value={ref.current as unknown as GeoModelRef}>
      {children}
    </GeoModelContext.Provider>
  );
}
