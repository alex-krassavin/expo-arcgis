import { requireNativeView } from 'expo';
import { useGeoModel, type MapRef } from 'expo-arcgis';
import { forwardRef, useImperativeHandle, useRef, type Ref } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

import { registryId } from './registryId';

export type OfflineMapAreasProps = ViewProps & {
  /**
   * Called when the user opens a downloaded map area, with it as a map to show in a
   * `<MapView map>`; and with `null` when the web map is online again.
   */
  onSelectionChange?: (offlineMap: MapRef | null) => void;
};

/** What `<OfflineMapAreas>`'s ref does. */
export type OfflineMapAreasHandle = {
  /** Goes back to the web map online (the selection becomes `null`). */
  goOnline(): Promise<void>;
};

type NativeOfflineMapAreasProps = Omit<OfflineMapAreasProps, 'onSelectionChange'> & {
  /** The nearest `<Map>`'s native object, by registry id. */
  geoModel: unknown;
  onSelectionChange?: (event: NativeSyntheticEvent<{ isOffline: boolean }>) => void;
  /** The native view, whose async functions are callable through it. */
  ref?: Ref<NativeOfflineMapAreas>;
};

type NativeOfflineMapAreas = {
  getSelectedMap(): Promise<MapRef | null>;
  goOnline(): Promise<void>;
};

const NativeOfflineMapAreas = requireNativeView<NativeOfflineMapAreasProps>(
  'ExpoArcgisToolkit',
  'OfflineMapAreasPanelView'
);

/**
 * The ArcGIS Toolkit's offline map areas: the preplanned map areas of the nearest `<Map>`'s web map,
 * and areas the user draws on demand. It downloads them, keeps them on the device, and opens one as
 * an offline map, which the app shows in a `<MapView map>`. A panel: lay it out anywhere inside the
 * `<Map>`, in a sheet or below the map. The `<Map>` must be a web map (`portalItem`) that is enabled
 * for offline use.
 *
 * On iOS it needs the expo-arcgis-toolkit config plugin, which permits its background downloads in
 * Info.plist. Without it, it shows nothing. On Android, downloads notify the user: request the
 * notification permission (Android 13+) for that.
 *
 * ```tsx
 * const [offlineMap, setOfflineMap] = useState<MapRef | null>(null);
 *
 * <Map portalItem={{ itemId: '<offline-enabled web map>' }}>
 *   <MapView map={offlineMap} style={{ flex: 1 }} />
 *   <OfflineMapAreas onSelectionChange={setOfflineMap} style={{ height: 320 }} />
 * </Map>
 * ```
 */
export const OfflineMapAreas = forwardRef<OfflineMapAreasHandle, OfflineMapAreasProps>(
  function OfflineMapAreas({ onSelectionChange, ...props }, handle) {
    const map = useGeoModel();
    const nativeRef = useRef<NativeOfflineMapAreas>(null);
    useImperativeHandle(
      handle,
      () => ({ goOnline: async () => nativeRef.current?.goOnline() }),
      []
    );
    return (
      <NativeOfflineMapAreas
        {...props}
        ref={nativeRef}
        geoModel={registryId(map)}
        onSelectionChange={async ({ nativeEvent }) => {
          const offlineMap = nativeEvent.isOffline
            ? ((await nativeRef.current?.getSelectedMap()) ?? null)
            : null;
          onSelectionChange?.(offlineMap);
        }}
      />
    );
  }
);
