import { NativeModule, requireNativeModule } from 'expo';
import { SharedObject } from 'expo-modules-core';

import type { MapProps } from './ExpoArcgis.types';

/**
 * Reference to a native `ArcGISMap` instance, shared by reference between JS and native.
 * The `<Map>` component constructs one and reconciles prop changes via `applyProps`.
 */
export declare class ArcGISMapRef extends SharedObject {
  /** Applies a subset of changed map props to the native map (generic, dispatched by key). */
  applyProps(changed: Partial<MapProps>): void;
}

declare class ExpoArcgisModule extends NativeModule {
  /** Sets the ArcGIS API key (access token) used to authenticate with ArcGIS services. */
  setApiKey(apiKey: string): void;
  /** Constructable native map handle (SharedObject). JS name mirrors the native class. */
  ArcGISMapRef: new (props?: MapProps) => ArcGISMapRef;
}

export default requireNativeModule<ExpoArcgisModule>('ExpoArcgis');
