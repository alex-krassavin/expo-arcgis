import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

export type CompassProps = {
  /** Where in the map view the compass sits. @default 'topTrailing' */
  alignment?: AccessoryAlignment;
  /** Hides the compass while the map points north. @default true */
  autoHide?: boolean;
  /** Width and height of the compass. @default 44 on iOS, 50 on Android — the Toolkits' sizes */
  size?: number;
};

/**
 * The ArcGIS Toolkit's compass, drawn over its `<MapView>`. It shows the map's heading while the map
 * is rotated, and turns the map back to north when tapped. Place it inside the `<MapView>`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <Compass />
 * </MapView>
 * ```
 */
export function Compass({ alignment = 'topTrailing', autoHide = true, size }: CompassProps) {
  useAccessory(() => new ExpoArcgisToolkit.CompassAccessory(), { alignment, autoHide, size });
  return null;
}
