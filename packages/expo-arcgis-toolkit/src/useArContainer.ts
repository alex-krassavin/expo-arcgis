import { useEffect, useMemo, useRef } from 'react';

import type { ArContainer } from './ExpoArcgisToolkitModule';
import type { ArInitializationStatus } from './arTypes';

type Listeners = {
  onInitializationStatusChange?: (status: ArInitializationStatus) => void;
  onCalibratingChange?: (isCalibrating: boolean) => void;
  onTrackingErrorChange?: (error: string | null) => void;
};

/**
 * Makes an AR view's container, keeps its native settings up to date, and forwards its events to
 * the latest listeners. The container lives as long as the component.
 */
export function useArContainer(
  Container: typeof ArContainer,
  settings: Record<string, unknown>,
  listeners: Listeners
): ArContainer {
  const container = useMemo(() => new Container(), [Container]);
  useEffect(() => () => container.release(), [container]);

  const key = JSON.stringify(settings);
  useEffect(() => {
    void container.update(settings);
    // `key` holds the settings' values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, key]);

  // The latest listeners, for the subscriptions below (set after render, as refs need).
  const latest = useRef(listeners);
  useEffect(() => {
    latest.current = listeners;
  });
  useEffect(() => {
    const subscriptions = [
      container.addListener('onInitializationStatusChange', (status) =>
        latest.current.onInitializationStatusChange?.(status)
      ),
      container.addListener('onCalibratingChange', ({ isCalibrating }) =>
        latest.current.onCalibratingChange?.(isCalibrating)
      ),
      container.addListener('onTrackingErrorChange', ({ error }) =>
        latest.current.onTrackingErrorChange?.(error)
      ),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [container]);

  return container;
}
