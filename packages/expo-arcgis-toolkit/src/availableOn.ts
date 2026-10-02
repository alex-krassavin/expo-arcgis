import { Platform } from 'react-native';

const warned = new Set<string>();

/**
 * Whether something the ArcGIS Maps SDK Toolkit has on one platform only is available here: a
 * component (`'<Name>'`, which renders nothing on the other platform) or an API (`'name'`, which does
 * nothing there). On the other platform it warns once in development.
 */
export function availableOn(platform: 'ios' | 'android', name: string): boolean {
  if (Platform.OS === platform) return true;
  if (__DEV__ && !warned.has(name)) {
    warned.add(name);
    const [os, toolkit] = platform === 'ios' ? ['iOS', 'Swift'] : ['Android', 'Kotlin'];
    const component = name.startsWith('<');
    console.warn(
      `[expo-arcgis-toolkit] ${component ? name : `\`${name}\``} is ${os}-only: the ArcGIS Maps ` +
        `SDK for ${toolkit} Toolkit has it, the other does not. ` +
        (component ? 'It renders nothing here.' : 'It does nothing here.')
    );
  }
  return false;
}
