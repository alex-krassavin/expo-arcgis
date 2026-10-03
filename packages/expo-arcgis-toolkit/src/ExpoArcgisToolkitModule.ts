import { NativeModule, requireNativeModule, SharedObject } from 'expo-modules-core';

import type { ArInitializationStatus } from './arTypes';

/**
 * A toolkit component drawn over a `<MapView>` or `<SceneView>`: the native object the component
 * hands to the view
 * (expo-arcgis's `GeoViewHost.addAccessory`).
 */
export declare class AccessoryRef extends SharedObject {
  /** Applies the component's props. */
  update(props: Record<string, unknown>): Promise<void>;
}

type ArContainerEvents = {
  onInitializationStatusChange(event: ArInitializationStatus): void;
  onCalibratingChange(event: { isCalibrating: boolean }): void;
  onTrackingErrorChange(event: { error: string | null }): void;
};

/**
 * An augmented reality view's container: expo-arcgis's native `SceneViewContainer`, which a
 * `<SceneView>` shows its scene in.
 */
export declare class ArContainer extends SharedObject<ArContainerEvents> {
  /** Applies the AR view's own props. */
  update(props: Record<string, unknown>): Promise<void>;
}

declare class ExpoArcgisToolkitModule extends NativeModule {
  CompassAccessory: typeof AccessoryRef;
  ScalebarAccessory: typeof AccessoryRef;
  /** iOS only. */
  OverviewMapAccessory: typeof AccessoryRef;
  /** iOS only. */
  LocationButtonAccessory: typeof AccessoryRef;
  FloorFilterAccessory: typeof AccessoryRef;
  FlyoverContainer: typeof ArContainer;
  TableTopContainer: typeof ArContainer;
  WorldScaleContainer: typeof ArContainer;
}

export default requireNativeModule<ExpoArcgisToolkitModule>('ExpoArcgisToolkit');
