import { SceneView, type SceneViewHandle } from 'expo-arcgis';
import { forwardRef, type PropsWithChildren } from 'react';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { ArInitializationStatus, ArLocation, ArSceneViewProps } from './arTypes';
import { useArContainer } from './useArContainer';

export type TableTopSceneViewProps = ArSceneViewProps & {
  /**
   * The scene location that sits on the physical surface the user taps. The Kotlin Toolkit's
   * `arcGISSceneAnchor`.
   */
  anchorPoint: ArLocation;
  /**
   * How far the camera moves in the scene for each meter the device moves. For a 1:1000 model of a
   * city on a table, 1000.
   */
  translationFactor: number;
  /** Clips the scene to this many meters around the anchor point; none when unset. */
  clippingDistance?: number;
  /**
   * Hides the Toolkit's coaching overlay, which shows how to find a surface.
   * @default false
   * @platform ios
   */
  coachingOverlayHidden?: boolean;
  /**
   * Whether the view requests the camera permission when it shows.
   * @default true
   * @platform android
   */
  requestCameraPermissionAutomatically?: boolean;
  /**
   * Called as initialization goes: initializing, detecting planes, initialized, or failed.
   * @platform android — the Swift Toolkit reports no status.
   */
  onInitializationStatusChange?: (status: ArInitializationStatus) => void;
};

/**
 * The ArcGIS Toolkit's tabletop AR scene view: the scene sits on a physical surface, such as a
 * table. Once the device has detected a surface, the user taps it to place the scene, and walks
 * around it to look. iOS uses ARKit; Android uses ARCore.
 *
 * It is a `<SceneView>` shown in augmented reality: place it inside a `<Scene>`, with overlays as
 * children, and its events and ref work as a scene view's do. The device's movement controls the
 * camera.
 *
 * Needs the camera: the expo-arcgis-toolkit config plugin's `ar` option.
 *
 * ```tsx
 * <Scene basemapStyle="arcGISImagery">
 *   <TableTopSceneView
 *     anchorPoint={{ latitude: 37.7946, longitude: -122.3995 }}
 *     translationFactor={1000}
 *     clippingDistance={400}
 *   />
 * </Scene>
 * ```
 */
export const TableTopSceneView = forwardRef<SceneViewHandle, PropsWithChildren<TableTopSceneViewProps>>(
  function TableTopSceneView(
    {
      anchorPoint,
      translationFactor,
      clippingDistance,
      coachingOverlayHidden,
      requestCameraPermissionAutomatically,
      onInitializationStatusChange,
      ...props
    },
    ref
  ) {
    const container = useArContainer(
      ExpoArcgisToolkit.TableTopContainer,
      {
        anchorPoint,
        translationFactor,
        clippingDistance,
        coachingOverlayHidden,
        requestCameraPermissionAutomatically,
      },
      { onInitializationStatusChange }
    );
    return <SceneView ref={ref} {...props} container={container} />;
  }
);
