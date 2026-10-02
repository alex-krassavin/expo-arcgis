import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import { availableOn } from './availableOn';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

export type OverviewMapProps = {
  /** Where in the view the overview map sits. @default 'topTrailing' */
  alignment?: AccessoryAlignment;
  /** How much farther out the overview map is than the view: its scale is the view's times this. @default 25 */
  scaleFactor?: number;
  /** Width of the overview map, in points. @default 200 */
  width?: number;
  /** Height of the overview map, in points. @default 132 */
  height?: number;
};

/**
 * The ArcGIS Toolkit's overview map, drawn over its `<MapView>` or `<SceneView>`: a small map that
 * marks the view's visible area (a map) or its center (a scene). Place it inside the view.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <OverviewMap alignment="bottomTrailing" />
 * </MapView>
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no overview map; on Android it renders nothing.
 */
export function OverviewMap(props: OverviewMapProps) {
  return availableOn('ios', 'OverviewMap') ? <OverviewMapAccessory {...props} /> : null;
}

function OverviewMapAccessory({
  alignment = 'topTrailing',
  scaleFactor = 25,
  width = 200,
  height = 132,
}: OverviewMapProps) {
  useAccessory(() => new ExpoArcgisToolkit.OverviewMapAccessory(), {
    alignment,
    scaleFactor,
    width,
    height,
  });
  return null;
}
