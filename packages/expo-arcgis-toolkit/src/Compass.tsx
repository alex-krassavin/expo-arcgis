import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

export type CompassProps = {
  /** Where in the view the compass sits. @default 'topTrailing' */
  alignment?: AccessoryAlignment;
  /** Hides the compass while the map points north. @default true */
  autoHide?: boolean;
  /** Width and height of the compass. @default 44 on iOS, 50 on Android — the Toolkits' sizes */
  size?: number;
};

/**
 * The ArcGIS Toolkit's compass, drawn over its `<MapView>` or `<SceneView>`. It shows the heading
 * while the view is rotated, and turns the view back to north when tapped (a scene keeps its camera's
 * position, pitch and roll). Place it inside the view.
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
