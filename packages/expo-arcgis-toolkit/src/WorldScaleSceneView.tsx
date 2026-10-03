import { SceneView, type SceneViewHandle } from 'expo-arcgis';
import { forwardRef, type PropsWithChildren } from 'react';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { ArInitializationStatus, ArSceneViewProps } from './arTypes';
import { useArContainer } from './useArContainer';

/** A SwiftUI alignment, for the calibration button. */
export type CalibrationButtonAlignment =
  | 'top'
  | 'topLeading'
  | 'topTrailing'
  | 'leading'
  | 'center'
  | 'trailing'
  | 'bottom'
  | 'bottomLeading'
  | 'bottomTrailing';

export type WorldScaleSceneViewProps = ArSceneViewProps & {
  /**
   * How ARKit tracks the world (the Swift Toolkit's `AppleWorldTracking.Mode`):
   * - `worldTracking`: the device's location and compass;
   * - `geoTracking`: Apple's geo tracking, where it is available;
   * - `preferGeoTracking`: geo tracking where it is available, world tracking elsewhere.
   * @default 'worldTracking'
   * @platform ios — on Android, see `worldScaleTrackingMode`.
   */
  trackingMode?: 'worldTracking' | 'geoTracking' | 'preferGeoTracking';
  /**
   * How ARCore tracks the world (the Kotlin Toolkit's `WorldScaleTrackingMode`):
   * - `world`: the device's location and compass;
   * - `geospatial`: Google's Geospatial API, where Street View covers the area. It needs a Google
   *   Cloud API key with the ARCore API: the config plugin's `ar.arcoreApiKey`.
   * @default 'world'
   * @platform android — on iOS, see `trackingMode`.
   */
  worldScaleTrackingMode?: 'world' | 'geospatial';
  /** Clips the scene to this many meters around the camera; none when unset. */
  clippingDistance?: number;
  /**
   * Hides the Toolkit's calibration view, which lets the user adjust heading and elevation.
   * @default false
   * @platform ios
   */
  calibrationViewHidden?: boolean;
  /**
   * Where the calibration button sits.
   * @default 'bottom'
   * @platform ios
   */
  calibrationButtonAlignment?: CalibrationButtonAlignment;
  /**
   * Called when the user starts or stops calibrating.
   * @platform ios
   */
  onCalibratingChange?: (isCalibrating: boolean) => void;
  /**
   * Called as initialization goes: initializing, initialized, or failed.
   * @platform android — the Swift Toolkit reports no status.
   */
  onInitializationStatusChange?: (status: ArInitializationStatus) => void;
  /**
   * Called when tracking fails, with the error, and with `null` once it recovers.
   * @platform android
   */
  onTrackingErrorChange?: (error: string | null) => void;
};

/**
 * The ArcGIS Toolkit's world-scale AR scene view: the scene lines up with the real world around
 * the device, so data shows where it is, such as pipes under the street. iOS uses ARKit; Android
 * uses ARCore.
 *
 * It is a `<SceneView>` shown in augmented reality: place it inside a `<Scene>`, with overlays as
 * children, and its events and ref work as a scene view's do. The device's movement controls the
 * camera.
 *
 * Needs the camera and the device's location: the expo-arcgis-toolkit config plugin's `ar` option.
 *
 * ```tsx
 * <Scene basemapStyle="arcGISImagery">
 *   <WorldScaleSceneView clippingDistance={400}>
 *     <GraphicsOverlay>…</GraphicsOverlay>
 *   </WorldScaleSceneView>
 * </Scene>
 * ```
 */
export const WorldScaleSceneView = forwardRef<
  SceneViewHandle,
  PropsWithChildren<WorldScaleSceneViewProps>
>(function WorldScaleSceneView(
  {
    trackingMode,
    worldScaleTrackingMode,
    clippingDistance,
    calibrationViewHidden,
    calibrationButtonAlignment,
    onCalibratingChange,
    onInitializationStatusChange,
    onTrackingErrorChange,
    ...props
  },
  ref
) {
  const container = useArContainer(
    ExpoArcgisToolkit.WorldScaleContainer,
    {
      trackingMode,
      worldScaleTrackingMode,
      clippingDistance,
      calibrationViewHidden,
      calibrationButtonAlignment,
    },
    { onCalibratingChange, onInitializationStatusChange, onTrackingErrorChange }
  );
  return <SceneView ref={ref} {...props} container={container} />;
});
