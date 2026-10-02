import { requireNativeView } from 'expo';
import { useGeoViewRef, type GeoViewHandle } from 'expo-arcgis';
import type { RefObject } from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

import { availableOn } from './availableOn';
import { registryId } from './registryId';

/** What the building explorer has selected: a building scene layer, and its level and phase. */
export type BuildingExplorerSelection = {
  /** The building scene layer's name. */
  layer: string;
  /** The level shown; empty for all of them. */
  level: string;
  /** The construction phase shown, if one is. */
  phase: number | null;
};

export type BuildingExplorerProps = ViewProps & {
  /**
   * The view the explorer is for: a `<LocalSceneView>` ref. @default the view the explorer is
   * placed in
   */
  geoView?: RefObject<GeoViewHandle | null>;
  /** Called with each selection, or `null` when it clears. */
  onSelectionChange?: (selection: BuildingExplorerSelection | null) => void;
};

type NativeBuildingExplorerProps = Omit<BuildingExplorerProps, 'geoView' | 'onSelectionChange'> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
  onSelectionChange?: (
    event: NativeSyntheticEvent<{ selection: BuildingExplorerSelection | null }>
  ) => void;
};

// The Kotlin Toolkit has no building explorer: the native view exists on iOS only.
const NativeBuildingExplorer =
  Platform.OS === 'ios'
    ? requireNativeView<NativeBuildingExplorerProps>('ExpoArcgisToolkit', 'BuildingExplorerView')
    : null;

/**
 * The ArcGIS Toolkit's building explorer, for a `<LocalSceneView>` with building scene layers: it
 * browses their levels, construction phases and categories, highlights a level (the ones above
 * hide, the ones below turn x-ray), and its "zoom to building" moves the view. A panel: place it
 * inside the `<LocalSceneView>` and lay it out over the scene, or anywhere else with the view's ref
 * as `geoView`.
 *
 * ```tsx
 * const view = useRef<LocalSceneViewHandle>(null);
 *
 * <Scene portalItem={{ itemId: '<local web scene with a building scene layer>' }}>
 *   <LocalSceneView ref={view} style={{ flex: 1 }} />
 * </Scene>
 * <BuildingExplorer geoView={view} style={{ height: 360 }} />
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no building explorer; on Android it renders nothing.
 */
export function BuildingExplorer(props: BuildingExplorerProps) {
  return availableOn('ios', 'BuildingExplorer') ? <BuildingExplorerPanel {...props} /> : null;
}

function BuildingExplorerPanel({ geoView, onSelectionChange, ...props }: BuildingExplorerProps) {
  const ref = useGeoViewRef(geoView);
  if (!NativeBuildingExplorer) return null;
  return (
    <NativeBuildingExplorer
      {...props}
      geoView={registryId(ref)}
      onSelectionChange={(event) => onSelectionChange?.(event.nativeEvent.selection)}
    />
  );
}
