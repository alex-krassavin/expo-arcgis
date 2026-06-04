import {
  AndroidConfig,
  ConfigPlugin,
  withGradleProperties,
  withProjectBuildGradle,
  withStringsXml,
} from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';

/** Esri public Maven repository that serves the ArcGIS Maps SDK for Kotlin. */
const DEFAULT_ESRI_MAVEN_URL = 'https://esri.jfrog.io/artifactory/arcgis';

// ArcGIS Maps SDK for Kotlin 300.0 minimum build requirements.
const REQUIRED_MIN_SDK = 28;
const REQUIRED_COMPILE_SDK = 36;

export const withArcGISAndroid: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  config = withEsriMavenRepository(config, props.androidMavenUrl ?? DEFAULT_ESRI_MAVEN_URL);
  config = withArcGISSdkVersions(config, props);

  if (props.apiKey) {
    config = withArcGISApiKeyResource(config, props.apiKey);
  }

  if (props.locationWhenInUseUsageDescription) {
    config = AndroidConfig.Permissions.withPermissions(config, [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]);
  }

  return config;
};

/** Adds the Esri Maven repository to the app's root build.gradle (allprojects.repositories). */
const withEsriMavenRepository: ConfigPlugin<string> = (config, url) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'expo-arcgis: cannot add the Esri Maven repository — android/build.gradle is not Groovy.'
      );
    }
    cfg.modResults.contents = addMavenRepository(cfg.modResults.contents, url);
    return cfg;
  });

function addMavenRepository(buildGradle: string, url: string): string {
  if (buildGradle.includes(url)) {
    return buildGradle; // idempotent
  }
  const snippet = `maven { url '${url}' }`;
  const allprojectsRepositories = /allprojects\s*\{[\s\S]*?repositories\s*\{/;
  if (allprojectsRepositories.test(buildGradle)) {
    return buildGradle.replace(allprojectsRepositories, (match) => `${match}\n        ${snippet}`);
  }
  // No allprojects block found — append a minimal one.
  return `${buildGradle}\n\nallprojects {\n    repositories {\n        ${snippet}\n    }\n}\n`;
}

/** Raises android.minSdkVersion / android.compileSdkVersion via gradle.properties (never lowers). */
const withArcGISSdkVersions: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  const minSdk = props.androidMinSdkVersion ?? REQUIRED_MIN_SDK;
  const compileSdk = props.androidCompileSdkVersion ?? REQUIRED_COMPILE_SDK;

  return withGradleProperties(config, (cfg) => {
    for (const [key, minValue] of [
      ['android.minSdkVersion', minSdk],
      ['android.compileSdkVersion', compileSdk],
    ] as const) {
      const existing = cfg.modResults.find(
        (item): item is { type: 'property'; key: string; value: string } =>
          item.type === 'property' && item.key === key
      );
      if (existing) {
        const current = parseInt(existing.value, 10);
        if (Number.isNaN(current) || current < minValue) {
          existing.value = String(minValue);
        }
      } else {
        cfg.modResults.push({ type: 'property', key, value: String(minValue) });
      }
    }
    return cfg;
  });
};

/** Stores the API key in strings.xml as `arcgis_api_key` for the native runtime to read. */
const withArcGISApiKeyResource: ConfigPlugin<string> = (config, apiKey) =>
  withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ _: apiKey, $: { name: 'arcgis_api_key', translatable: 'false' } }],
      cfg.modResults
    );
    return cfg;
  });
