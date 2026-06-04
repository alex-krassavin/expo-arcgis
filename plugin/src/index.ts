import { ConfigPlugin, createRunOncePlugin, withPlugins } from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';
import { withArcGISAndroid } from './withArcGISAndroid';
import { withArcGISIos } from './withArcGISIos';

/**
 * Expo config plugin for `expo-arcgis`.
 *
 * Pulls the native ArcGIS Maps SDK into the consuming app and configures the build:
 * - Android: Esri Maven repository, minSdk >= 28, compileSdk >= 36, optional API key + location.
 * - iOS: deployment target >= 17.0, optional API key + location usage description.
 *
 * The ArcGIS SDK artifacts themselves are declared by the module's own android/build.gradle
 * and ios/ExpoArcgis.podspec; this plugin makes the surrounding app build able to resolve them.
 */
const withArcGIS: ConfigPlugin<ArcGISPluginProps | void> = (config, props) => {
  const options: ArcGISPluginProps = props || {};
  return withPlugins(config, [
    [withArcGISAndroid, options],
    [withArcGISIos, options],
  ]);
};

export type { ArcGISPluginProps } from './types';

export default createRunOncePlugin(withArcGIS, 'expo-arcgis', '0.1.0');
