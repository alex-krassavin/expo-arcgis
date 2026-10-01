import { NativeModule, requireNativeModule, SharedObject } from 'expo-modules-core';

/**
 * A toolkit component drawn over a `<MapView>`: the native object the component hands to the view
 * (expo-arcgis's `GeoViewHost.addAccessory`).
 */
export declare class AccessoryRef extends SharedObject {
  /** Applies the component's props. */
  update(props: Record<string, unknown>): Promise<void>;
}

declare class ExpoArcgisToolkitModule extends NativeModule {
  CompassAccessory: typeof AccessoryRef;
  ScalebarAccessory: typeof AccessoryRef;
}

export default requireNativeModule<ExpoArcgisToolkitModule>('ExpoArcgisToolkit');
