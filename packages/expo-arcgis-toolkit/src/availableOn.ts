import { Platform } from 'react-native';

const warned = new Set<string>();

/**
 * Whether a component the ArcGIS Maps SDK Toolkit has on one platform only can render here. On the
 * other platform it renders nothing, and warns once in development.
 */
export function availableOn(platform: 'ios' | 'android', component: string): boolean {
  if (Platform.OS === platform) return true;
  if (__DEV__ && !warned.has(component)) {
    warned.add(component);
    const [os, toolkit] = platform === 'ios' ? ['iOS', 'Swift'] : ['Android', 'Kotlin'];
    console.warn(
      `[expo-arcgis-toolkit] <${component}> is ${os}-only: the ArcGIS Maps SDK for ${toolkit} ` +
        'Toolkit has it, the other does not. It renders nothing here.'
    );
  }
  return false;
}
