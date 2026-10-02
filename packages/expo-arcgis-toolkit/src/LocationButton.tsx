import type { LocationDisplayAutoPanMode } from 'expo-arcgis';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import { availableOn } from './availableOn';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

export type LocationButtonProps = {
  /** Where in the map view the button sits. @default 'topLeading' */
  alignment?: AccessoryAlignment;
  /**
   * The auto-pan modes a tap cycles through while the location shows. With `'off'` among them, a
   * long press stops the location display. @default the Toolkit's modes
   */
  autoPanModes?: LocationDisplayAutoPanMode[];
};

/**
 * The ArcGIS Toolkit's location button, drawn over its `<MapView>`. A tap starts the map's location
 * display, then cycles through its auto-pan modes. It drives the same location display as the
 * `<MapView>`'s `locationDisplay` prop. Place it inside the `<MapView>`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <LocationButton autoPanModes={['recenter', 'compassNavigation']} />
 * </MapView>
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no location button; on Android it renders nothing.
 */
export function LocationButton(props: LocationButtonProps) {
  return availableOn('ios', '<LocationButton>') ? <LocationButtonAccessory {...props} /> : null;
}

function LocationButtonAccessory({ alignment = 'topLeading', autoPanModes }: LocationButtonProps) {
  useAccessory(() => new ExpoArcgisToolkit.LocationButtonAccessory(), { alignment, autoPanModes });
  return null;
}
