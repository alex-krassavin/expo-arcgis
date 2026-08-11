import {
  AndroidConfig,
  ConfigPlugin,
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
  withStringsXml,
} from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';

/** Esri public Maven repository that serves the ArcGIS Maps SDK for Kotlin. */
const DEFAULT_ESRI_MAVEN_URL = 'https://esri.jfrog.io/artifactory/arcgis';

// ArcGIS Maps SDK for Kotlin 300.1 minimum build requirements. API 28 is deprecated by Esri
// (300.1 is the last release to support it); the next SDK release moves the floor to API 29.
const REQUIRED_MIN_SDK = 28;

// Expo default compile SDK is 36, but ArcGIS Maps SDK for Kotlin 300.1 requires 37:
// https://github.com/Esri/arcgis-maps-sdk-kotlin-toolkit/pull/1135
const REQUIRED_COMPILE_SDK = 37;

/**
 * From API 37 on, the SDK platform is published only under a minor version — `platforms;android-37.0`,
 * `37.1` and so on, with no plain `platforms;android-37`. An integer `compileSdk` makes AGP look the
 * platform up by the legacy `android-37` target hash, which nothing provides, so release builds die in
 * R8 with "Failed to find target with hash string 'android-37'". Naming the minor level sends it after
 * `android-37.0` instead.
 *
 * API 36 and below still ship an unsuffixed `platforms;android-36` and no `android-36.0`, so a minor
 * level is only correct from 37 up — below that it would break the lookup it is meant to fix.
 */
const MINOR_VERSIONED_FROM_COMPILE_SDK = 37;
const REQUIRED_COMPILE_SDK_MINOR = 0;

export const withArcGISAndroid: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  config = withEsriMavenRepository(config, props.androidMavenUrl ?? DEFAULT_ESRI_MAVEN_URL);
  config = withArcGISSdkVersions(config, props);
  config = withArcGISKotlinMetadataFix(config);

  if (
    (props.androidCompileSdkVersion ?? REQUIRED_COMPILE_SDK) >= MINOR_VERSIONED_FROM_COMPILE_SDK
  ) {
    config = withArcGISCompileSdkMinor(config, REQUIRED_COMPILE_SDK_MINOR);
  }

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

/**
 * Names the compile SDK's minor level in the app module, so AGP resolves the minor-versioned platform
 * package. gradle.properties cannot carry this: Expo parses `android.compileSdkVersion` to an Int and
 * neither Expo nor React Native plumbs a minor level, so it has to be set in the `android {}` block.
 *
 * Only the app module needs it. Library modules compile against the same platform without trouble; it
 * is R8, which runs in the app module, that resolves the platform by target hash.
 */
const withArcGISCompileSdkMinor: ConfigPlugin<number> = (config, minor) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'expo-arcgis: cannot set compileSdkMinor — android/app/build.gradle is not Groovy.'
      );
    }
    cfg.modResults.contents = setCompileSdkMinor(cfg.modResults.contents, minor);
    return cfg;
  });

/** Adds `compileSdkMinor <minor>` directly below the app module's `compileSdk` assignment. */
export function setCompileSdkMinor(appBuildGradle: string, minor: number): string {
  if (/^[ \t]*compileSdkMinor\b/m.test(appBuildGradle)) {
    return appBuildGradle; // idempotent
  }
  // `compileSdk` followed by whitespace, so compileSdkVersion/compileSdkPreview don't match.
  const compileSdk = /^([ \t]*)compileSdk[ \t]+.+$/m;
  const match = appBuildGradle.match(compileSdk);
  if (!match) {
    throw new Error(
      'expo-arcgis: cannot set compileSdkMinor — no compileSdk assignment in android/app/build.gradle.'
    );
  }
  return appBuildGradle.replace(
    compileSdk,
    (line) => `${line}\n${match[1]}compileSdkMinor ${minor}`
  );
}

/** Stores the API key in strings.xml as `arcgis_api_key` for the native runtime to read. */
const withArcGISApiKeyResource: ConfigPlugin<string> = (config, apiKey) =>
  withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [{ _: apiKey, $: { name: 'arcgis_api_key', translatable: 'false' } }],
      cfg.modResults
    );
    return cfg;
  });

const SKIP_METADATA_FLAG = '-Xskip-metadata-version-check';

/**
 * ArcGIS Maps SDK 300.1 is built with Kotlin 2.3.20; its kotlin-stdlib/reflect 2.3.20 resolve across
 * the whole app, but Expo SDK 56 compiles with Kotlin 2.1.0. Let every module read the newer
 * metadata so the app (expo, expo-modules-core, this module) compiles.
 */
const withArcGISKotlinMetadataFix: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'expo-arcgis: cannot apply the Kotlin metadata fix — android/build.gradle is not Groovy.'
      );
    }
    if (!cfg.modResults.contents.includes(SKIP_METADATA_FLAG)) {
      cfg.modResults.contents += `

// expo-arcgis: ArcGIS Maps SDK 300.1 ships Kotlin 2.3.20 metadata, newer than Expo SDK 56's compiler.
allprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      freeCompilerArgs += ["${SKIP_METADATA_FLAG}"]
    }
  }
}
`;
    }
    return cfg;
  });
