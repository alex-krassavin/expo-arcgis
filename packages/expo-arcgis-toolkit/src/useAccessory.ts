import { useGeoView } from 'expo-arcgis';
import { useEffect, useMemo } from 'react';

import type { AccessoryRef } from './ExpoArcgisToolkitModule';

/**
 * Creates a toolkit component's native accessory, keeps its props applied, and shows it over the
 * nearest `<MapView>` while the component is mounted.
 */
export function useAccessory(create: () => AccessoryRef, props: Record<string, unknown>) {
  const view = useGeoView();
  // One native object for the component's lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const accessory = useMemo(create, []);
  // Props compared by value: a re-render with the same props sends nothing.
  const values = JSON.stringify(props);
  useEffect(() => {
    accessory.update(JSON.parse(values));
  }, [accessory, values]);
  useEffect(() => {
    view.addAccessory(accessory);
    return () => view.removeAccessory(accessory);
  }, [view, accessory]);
}
