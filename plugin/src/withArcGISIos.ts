import {
  ConfigPlugin,
  withInfoPlist,
  withPodfileProperties,
  withXcodeProject,
  XcodeProject,
} from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';

/** ArcGIS Maps SDK for Swift 300.0 requires iOS 17.0+. */
const REQUIRED_IOS_DEPLOYMENT_TARGET = '17.0';

export const withArcGISIos: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  const target = props.iosDeploymentTarget ?? REQUIRED_IOS_DEPLOYMENT_TARGET;
  // Pods read the target from Podfile.properties.json; the app target reads it from the
  // .xcodeproj build settings. ArcGIS needs both raised to 17.0, or the app target (which
  // imports our module via ExpoModulesProvider.swift) fails: "compiling for iOS 16.4, but
  // module 'ExpoArcgis' has a minimum deployment target of iOS 17.0".
  config = withArcGISPodfileDeploymentTarget(config, target);
  config = withArcGISAppDeploymentTarget(config, target);
  config = withArcGISEmbedFramework(config);

  if (props.apiKey) {
    config = withArcGISApiKeyInfoPlist(config, props.apiKey);
  }

  if (props.locationWhenInUseUsageDescription) {
    config = withLocationUsageDescription(config, props.locationWhenInUseUsageDescription);
  }

  return config;
};

/** Raises the iOS deployment target in Podfile.properties.json (never lowers it). */
const withArcGISPodfileDeploymentTarget: ConfigPlugin<string> = (config, target) =>
  withPodfileProperties(config, (cfg) => {
    const current = cfg.modResults['ios.deploymentTarget'];
    if (!current || parseFloat(current) < parseFloat(target)) {
      cfg.modResults['ios.deploymentTarget'] = target;
    }
    return cfg;
  });

/** Raises IPHONEOS_DEPLOYMENT_TARGET on the app project's build configurations (never lowers). */
const withArcGISAppDeploymentTarget: ConfigPlugin<string> = (config, target) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings;
      // Skip `*_comment` string entries (no buildSettings) and configs that don't pin the target.
      const current = buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
      if (current && parseFloat(String(current).replace(/"/g, '')) < parseFloat(target)) {
        buildSettings.IPHONEOS_DEPLOYMENT_TARGET = target;
      }
    }
    return cfg;
  });

/**
 * Embeds the ArcGIS dynamic framework into the app bundle. ArcGIS is pulled in as a Swift Package
 * product (spm_dependency) and linked into the static ExpoArcgis pod, but neither CocoaPods nor
 * Xcode copies it into the app's Frameworks dir — so the app links fine yet crashes at launch with
 * `Library not loaded: @rpath/ArcGIS.framework/ArcGIS`. We add an "Embed Frameworks" copy phase
 * (CodeSignOnCopy) on the app target referencing the built product — Xcode's "Embed & Sign".
 */
const withArcGISEmbedFramework: ConfigPlugin = (config) =>
  withXcodeProject(config, (cfg) => {
    embedArcGISFramework(cfg.modResults);
    return cfg;
  });

/** Mutates the parsed Xcode project in place. Exported for tests. */
export function embedArcGISFramework(project: XcodeProject): void {
  const FRAMEWORK = 'ArcGIS.framework';
  const COMMENT = `${FRAMEWORK} in Embed Frameworks`;
  const objects = project.hash.project.objects;

  // Idempotent: skip if already embedded (prebuild may run plugins more than once).
  const buildFiles = objects.PBXBuildFile || {};
  for (const key of Object.keys(buildFiles)) {
    if (buildFiles[key] === COMMENT) {
      return;
    }
  }

  // Find the application target (fall back to the first target).
  const nativeTargets = objects.PBXNativeTarget || {};
  let targetUuid: string | undefined;
  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith('_comment')) continue;
    const productType = String(nativeTargets[key].productType || '').replace(/"/g, '');
    if (productType === 'com.apple.product-type.application') {
      targetUuid = key;
      break;
    }
  }
  if (!targetUuid) {
    targetUuid = project.getFirstTarget().uuid;
  }

  // Create an "Embed Frameworks" copy-files phase (dstSubfolderSpec 10 = Frameworks).
  const phase = project.addBuildPhase(
    [],
    'PBXCopyFilesBuildPhase',
    'Embed Frameworks',
    targetUuid,
    'frameworks'
  );

  // Reference the framework as a build product and embed it with code signing.
  const fileRefUuid = project.generateUuid();
  objects.PBXFileReference[fileRefUuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'wrapper.framework',
    name: FRAMEWORK,
    path: FRAMEWORK,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  };
  objects.PBXFileReference[`${fileRefUuid}_comment`] = FRAMEWORK;

  const buildFileUuid = project.generateUuid();
  objects.PBXBuildFile[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: fileRefUuid,
    fileRef_comment: FRAMEWORK,
    settings: { ATTRIBUTES: ['CodeSignOnCopy', 'RemoveHeadersOnCopy'] },
  };
  objects.PBXBuildFile[`${buildFileUuid}_comment`] = COMMENT;
  phase.buildPhase.files.push({ value: buildFileUuid, comment: COMMENT });

  // addBuildPhase appends, which can land this copy phase after script phases other
  // plugins added earlier (e.g. expo-datadog's dSYM upload) — Xcode then reports a
  // dependency cycle: the copy is gated on the script phase, whose dSYM input needs
  // the finished .app, which needs the copy. Move it to the slot after Resources,
  // where Xcode itself puts Embed Frameworks, ahead of any tail script phases.
  const buildPhases = (nativeTargets[targetUuid] || {}).buildPhases || [];
  const embedIndex = buildPhases.findIndex(
    (entry: { value: string }) => entry.value === phase.uuid
  );
  const resourcesIndex = buildPhases.findIndex(
    (entry: { comment?: string }) => entry.comment === 'Resources'
  );
  if (embedIndex !== -1 && resourcesIndex !== -1 && embedIndex > resourcesIndex + 1) {
    const [entry] = buildPhases.splice(embedIndex, 1);
    buildPhases.splice(resourcesIndex + 1, 0, entry);
  }
}

/** Stores the API key in Info.plist as `ArcGISAPIKey` for the native runtime to read. */
const withArcGISApiKeyInfoPlist: ConfigPlugin<string> = (config, apiKey) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.ArcGISAPIKey = apiKey;
    return cfg;
  });

const withLocationUsageDescription: ConfigPlugin<string> = (config, description) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationWhenInUseUsageDescription =
      cfg.modResults.NSLocationWhenInUseUsageDescription ?? description;
    return cfg;
  });
