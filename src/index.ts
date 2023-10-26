import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to Arcgis.web.ts
// and on native platforms to Arcgis.ts
import ArcgisModule from './ArcgisModule';
import ArcgisView from './ArcgisView';
import { ChangeEventPayload, ArcgisViewProps } from './Arcgis.types';

// Get the native constant value.
export const PI = ArcgisModule.PI;

export function hello(): string {
  return ArcgisModule.hello();
}

export async function setValueAsync(value: string) {
  return await ArcgisModule.setValueAsync(value);
}

const emitter = new EventEmitter(ArcgisModule ?? NativeModulesProxy.Arcgis);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ArcgisView, ArcgisViewProps, ChangeEventPayload };
