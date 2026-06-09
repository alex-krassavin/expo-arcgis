import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { UtilityNetworkHandle, UtilityNetworkProps } from './ExpoArcgis.types';
import type { MapRef, UtilityNetworkRef } from './ExpoArcgisModule';
// UtilityNetworkRef is registered in the Extras native module (main-module 64 KB budget).
import ExtrasModule from './ExpoArcgisExtrasModule';
import { useGeoModel } from './contexts';

/**
 * Declarative `UtilityNetwork`. Loads from `serviceGeodatabaseUrl`, attaches itself to the nearest
 * `<Map>`, and exposes `trace` through a `ref`. Secured services (most utility networks) need a
 * `setTokenCredential(...)` call first.
 */
export const UtilityNetwork = forwardRef<UtilityNetworkHandle, UtilityNetworkProps>(
  function UtilityNetwork({ serviceGeodatabaseUrl, onLoad, onLoadError }, handle) {
    const map = useGeoModel() as MapRef;
    const ref = useRef<UtilityNetworkRef | undefined>(undefined);
    if (!ref.current) {
      ref.current = new ExtrasModule.UtilityNetworkRef({ serviceGeodatabaseUrl });
    }

    useEffect(() => {
      const network = ref.current!;
      let released = false;
      network
        .load(map)
        .then((name) => {
          if (!released) onLoad?.(name);
        })
        .catch((error) => {
          if (!released) onLoadError?.(String(error));
        });
      return () => {
        released = true;
        network.release();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The native ref exposes `trace` (typed to match UtilityNetworkHandle), so hand it over directly.
    useImperativeHandle(handle, () => ref.current!, []);

    return null;
  }
);
