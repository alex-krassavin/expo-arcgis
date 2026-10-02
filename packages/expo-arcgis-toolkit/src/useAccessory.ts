import { useGeoView } from 'expo-arcgis';
import { useEffect, useMemo, useRef } from 'react';

import type { AccessoryRef } from './ExpoArcgisToolkitModule';

/**
 * Creates a toolkit component's native accessory, keeps its props applied, and shows it over the
 * nearest `<MapView>` / `<SceneView>` while the component is mounted. `events` maps the accessory's
 * native events to the component's callbacks.
 */
export function useAccessory(
  create: () => AccessoryRef,
  props: Record<string, unknown>,
  events: Record<string, ((payload: any) => void) | undefined> = {}
) {
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
  // The latest callbacks, so a new function each render doesn't resubscribe.
  const handlers = useRef(events);
  handlers.current = events;
  const eventNames = Object.keys(events).sort().join(',');
  useEffect(() => {
    const subscriptions = eventNames
      .split(',')
      .filter(Boolean)
      .map((name) =>
        (accessory as any).addListener(name, (payload: unknown) => handlers.current[name]?.(payload))
      );
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [accessory, eventNames]);
}
