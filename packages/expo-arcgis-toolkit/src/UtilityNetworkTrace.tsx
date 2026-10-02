import { requireNativeView } from 'expo';
import { useGeoViewRef, type GeoViewHandle, type GraphicsOverlayRef } from 'expo-arcgis';
import { useEffect, useState, type RefObject } from 'react';
import type { ViewProps } from 'react-native';

import { registryId } from './registryId';

export type UtilityNetworkTraceProps = ViewProps & {
  /**
   * The view the trace is for: a `<MapView>` ref, whose web map has utility networks and named
   * trace configurations. @default the view the trace is placed in
   */
  geoView?: RefObject<GeoViewHandle | null>;
  /**
   * The overlay the trace draws its starting points and results into: a `<GraphicsOverlay>` ref,
   * declared in the map view. The Toolkit needs one, so without it the trace renders nothing.
   */
  graphicsOverlay: RefObject<GraphicsOverlayRef | null>;
  /**
   * Where the user tapped the map. While the trace is adding starting points, it adds them there.
   * Pass the map point from the `<MapView>`'s `onTap`, as the Toolkit's examples wire the map
   * view's taps.
   */
  mapPoint?: { latitude: number; longitude: number } | null;
};

type NativeUtilityNetworkTraceProps = Omit<UtilityNetworkTraceProps, 'geoView' | 'graphicsOverlay'> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
  /** expo-arcgis's GraphicsOverlayRef, by registry id. */
  graphicsOverlay: unknown;
};

const NativeUtilityNetworkTrace = requireNativeView<NativeUtilityNetworkTraceProps>(
  'ExpoArcgisToolkit',
  'UtilityNetworkTraceView'
);

/**
 * The ArcGIS Toolkit's utility network trace: for a map view showing a web map with utility
 * networks, it runs their named trace configurations. The user picks a configuration, adds
 * starting points by tapping the map, and traces. Starting points and results are drawn into the
 * app's overlay, and several traces can be compared. A panel: place it inside the `<MapView>` and
 * lay it out over the map, or anywhere else with the view's ref as `geoView`.
 *
 * ```tsx
 * const overlay = useRef<GraphicsOverlayRef>(null);
 * const [mapPoint, setMapPoint] = useState<Point | null>(null);
 *
 * <MapView style={{ flex: 1 }} onTap={(e) => setMapPoint(e.nativeEvent.mapPoint)}>
 *   <GraphicsOverlay ref={overlay} />
 *   <UtilityNetworkTrace graphicsOverlay={overlay} mapPoint={mapPoint} style={styles.panel} />
 * </MapView>
 * ```
 */
export function UtilityNetworkTrace({
  geoView,
  graphicsOverlay,
  ...props
}: UtilityNetworkTraceProps) {
  const ref = useGeoViewRef(geoView);
  // React fills a ref in once its component mounts, after this one renders: read it in an effect.
  const [overlay, setOverlay] = useState<GraphicsOverlayRef | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the ref is only filled in at commit
    setOverlay(graphicsOverlay.current ?? null);
  }, [graphicsOverlay]);
  return (
    <NativeUtilityNetworkTrace
      {...props}
      geoView={registryId(ref)}
      graphicsOverlay={registryId(overlay)}
    />
  );
}
