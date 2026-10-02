import { requireNativeView } from 'expo';
import { useGeoViewRef, type GeoViewHandle } from 'expo-arcgis';
import type { RefObject } from 'react';
import { Platform, processColor, type ColorValue, type ViewProps } from 'react-native';

import { availableOn } from './availableOn';
import { registryId } from './registryId';

/** A text style merged over the Toolkit's (Material 3) one. */
export type LegendTextStyle = {
  /** In sp. */
  fontSize?: number;
  color?: ColorValue;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
};

export type LegendProps = ViewProps & {
  /**
   * The view the legend is for: a `<MapView>`, `<SceneView>` or `<LocalSceneView>` ref.
   * @default the view the legend is placed in
   */
  geoView?: RefObject<GeoViewHandle | null>;
  /** Lists the layers from the bottom one up. @default false */
  reverseLayerOrder?: boolean;
  /** Leaves out the layers that don't draw at the view's current scale. @default true */
  respectScaleRange?: boolean;
  /** The heading; an empty string shows none. @default the Toolkit's ("Legend", localized) */
  title?: string;
  /** The Toolkit's `Typography`: text styles for its title, layer names and symbol labels. */
  typography?: {
    title?: LegendTextStyle;
    layerName?: LegendTextStyle;
    subLayerName?: LegendTextStyle;
    legendInfoName?: LegendTextStyle;
  };
};

type NativeLegendProps = Omit<LegendProps, 'geoView'> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
};

// The Swift Toolkit has no legend: the native view exists on Android only.
const NativeLegend =
  Platform.OS === 'android'
    ? requireNativeView<NativeLegendProps>('ExpoArcgisToolkit', 'LegendView')
    : null;

/**
 * The ArcGIS Toolkit's legend: the symbols of a view's map or scene, its layers' and its basemap's,
 * at the view's current scale. A panel: place it inside the `<MapView>` / `<SceneView>` and lay it
 * out over the map, or anywhere else with the view's ref as `geoView`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <Legend style={{ position: 'absolute', bottom: 32, left: 16, width: 220, height: 280 }} />
 * </MapView>
 * ```
 *
 * @platform android — the Swift Toolkit has no legend; on iOS it renders nothing.
 */
export function Legend(props: LegendProps) {
  return availableOn('android', 'Legend') ? <LegendView {...props} /> : null;
}

function LegendView({ geoView, typography, ...props }: LegendProps) {
  const ref = useGeoViewRef(geoView);
  if (!NativeLegend) return null;
  return (
    <NativeLegend
      {...props}
      geoView={registryId(ref)}
      typography={typography && nativeTypography(typography)}
    />
  );
}

/** The typography with its colors as the ARGB numbers the native side reads. */
function nativeTypography(typography: NonNullable<LegendProps['typography']>) {
  return Object.fromEntries(
    Object.entries(typography).map(([key, style]) => [
      key,
      style && { ...style, color: style.color == null ? undefined : processColor(style.color) },
    ])
  ) as LegendProps['typography'];
}
