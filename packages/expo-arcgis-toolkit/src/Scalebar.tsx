import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

export type ScalebarStyle = 'alternatingBar' | 'bar' | 'dualUnitLine' | 'graduatedLine' | 'line';

export type ScalebarProps = {
  /** Where in the map view the scalebar sits. @default 'bottomLeading' */
  alignment?: AccessoryAlignment;
  /** The widest the scalebar may get, in points (dp on Android). @default 175 */
  maxWidth?: number;
  /** @default 'alternatingBar' */
  style?: ScalebarStyle;
  /** @default the device's measurement system */
  units?: 'metric' | 'imperial';
  /** The scalebar shows only when the map is zoomed in further than this scale. @default 0 (always) */
  minScale?: number;
  /** Measures distances geodetically, which stays accurate at small scales. @default true */
  useGeodeticCalculations?: boolean;
};

/**
 * The ArcGIS Toolkit's scalebar, drawn over its `<MapView>`. It shows the current scale as a
 * distance on the map. Place it inside the `<MapView>`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <Scalebar units="metric" />
 * </MapView>
 * ```
 */
export function Scalebar({
  alignment = 'bottomLeading',
  maxWidth = 175,
  style = 'alternatingBar',
  units,
  minScale = 0,
  useGeodeticCalculations = true,
}: ScalebarProps) {
  useAccessory(() => new ExpoArcgisToolkit.ScalebarAccessory(), {
    alignment,
    maxWidth,
    style,
    units,
    minScale,
    useGeodeticCalculations,
  });
  return null;
}
