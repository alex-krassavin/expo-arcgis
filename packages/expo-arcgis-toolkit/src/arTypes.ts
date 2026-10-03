import type { SceneViewProps } from 'expo-arcgis';

/** A location in the scene: WGS84 degrees, and meters above sea level. */
export type ArLocation = { latitude: number; longitude: number; altitude?: number };

/**
 * Where an AR view's initialization stands (the Kotlin Toolkit's `…SceneViewStatus`):
 * - `initializing`;
 * - `detectingPlanes`: the tabletop view looks for a surface to tap;
 * - `initialized`;
 * - `failedToInitialize`, with the `error`: for example, ARCore isn't supported or installed, or
 *   the camera permission was denied.
 */
export type ArInitializationStatus = {
  status: 'initializing' | 'detectingPlanes' | 'initialized' | 'failedToInitialize';
  /** Why it failed to initialize. */
  error?: string;
};

/**
 * What an AR view takes from `<SceneView>`: everything but the camera, which the device's
 * movement controls.
 */
export type ArSceneViewProps = Omit<
  SceneViewProps,
  'camera' | 'cameraController' | 'orbitGraphic' | 'container'
>;
