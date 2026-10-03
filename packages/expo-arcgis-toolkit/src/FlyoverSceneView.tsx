import { SceneView, type SceneViewHandle } from 'expo-arcgis';
import { forwardRef, type PropsWithChildren } from 'react';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { ArInitializationStatus, ArLocation, ArSceneViewProps } from './arTypes';
import { useArContainer } from './useArContainer';

export type FlyoverSceneViewProps = ArSceneViewProps & {
  /** Where the camera starts. The Kotlin Toolkit's proxy `location`. */
  initialLocation: ArLocation;
  /**
   * The camera's starting heading, in degrees. On iOS, unset orients the scene to the device's
   * compass heading; on Android, unset is 0 (the Kotlin Toolkit has no compass heading).
   */
  initialHeading?: number;
  /** How far the camera moves in the scene for each meter the device moves. */
  translationFactor: number;
  /**
   * Called as initialization goes: initializing, initialized, or failed.
   * @platform android — the Swift Toolkit reports no status.
   */
  onInitializationStatusChange?: (status: ArInitializationStatus) => void;
};

/**
 * The ArcGIS Toolkit's flyover AR scene view: as the device moves, the camera flies over the scene
 * from its initial location, without the camera feed. iOS uses ARKit; Android uses ARCore.
 *
 * It is a `<SceneView>` shown in augmented reality: place it inside a `<Scene>`, with overlays as
 * children, and its events and ref work as a scene view's do. The device's movement controls the
 * camera.
 *
 * Needs the camera: the expo-arcgis-toolkit config plugin's `ar` option.
 *
 * ```tsx
 * <Scene basemapStyle="arcGISImagery">
 *   <FlyoverSceneView
 *     initialLocation={{ latitude: 48.8584, longitude: 2.2945, altitude: 600 }}
 *     translationFactor={1000}
 *   />
 * </Scene>
 * ```
 */
export const FlyoverSceneView = forwardRef<SceneViewHandle, PropsWithChildren<FlyoverSceneViewProps>>(
  function FlyoverSceneView(
    { initialLocation, initialHeading, translationFactor, onInitializationStatusChange, ...props },
    ref
  ) {
    const container = useArContainer(
      ExpoArcgisToolkit.FlyoverContainer,
      { initialLocation, initialHeading, translationFactor },
      { onInitializationStatusChange }
    );
    return <SceneView ref={ref} {...props} container={container} />;
  }
);
