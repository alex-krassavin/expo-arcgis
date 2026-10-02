import {
  ConfigPlugin,
  withInfoPlist,
  withPodfile,
  withPodfileProperties,
  withXcodeProject,
  XcodeProject,
} from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';

/** ArcGIS Maps SDK for Swift 300.1 requires iOS 18.0+ (300.0 required 17.0). */
const REQUIRED_IOS_DEPLOYMENT_TARGET = '18.0';

export const withArcGISIos: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  const target = props.iosDeploymentTarget ?? REQUIRED_IOS_DEPLOYMENT_TARGET;
  // Pods read the target from Podfile.properties.json; the app target reads it from the
  // .xcodeproj build settings. ArcGIS needs both raised to 18.0, or the app target (which
  // imports our module via ExpoModulesProvider.swift) fails: "compiling for iOS 16.4, but
  // module 'ExpoArcgis' has a minimum deployment target of iOS 18.0".
  config = withArcGISPodfileDeploymentTarget(config, target);
  config = withArcGISAppDeploymentTarget(config, target);
  config = withArcGISEmbedFramework(config);
  config = withArcGISSignatureCleanup(config);
  config = withArcGISFlattenedModuleMaps(config);

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

  const nativeTargets = objects.PBXNativeTarget || {};
  const targetUuid = findApplicationTargetUuid(project);

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

const withArcGISSignatureCleanup: ConfigPlugin = (config) =>
  withXcodeProject(config, (cfg) => {
    addSignatureCleanupPhase(cfg.modResults);
    return cfg;
  });

const SIGNATURE_CLEANUP_PHASE_NAME = '[expo-arcgis] Remove duplicate ArcGIS.xcframework signature';

/**
 * Both the app target and the ExpoArcgis pod target run SignatureCollection for the signed
 * ArcGIS xcframework, and archive-time signature aggregation copies both results into
 * Signatures/ — failing with `"ArcGIS.xcframework-ios.signature" couldn't be copied to
 * "Signatures" because an item with the same name already exists` (same Xcode bug as
 * maplibre-react-native#1489). Delete the app-level copy during the build so aggregation
 * only sees the pod target's. Mutates the parsed Xcode project in place; exported for tests.
 */
export function addSignatureCleanupPhase(project: XcodeProject): void {
  const scriptPhases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
  // Idempotent: skip if already added (prebuild may run plugins more than once).
  for (const key of Object.keys(scriptPhases)) {
    if (key.endsWith('_comment')) continue;
    if (String(scriptPhases[key]?.name || '').includes(SIGNATURE_CLEANUP_PHASE_NAME)) {
      return;
    }
  }

  const phase = project.addBuildPhase(
    [],
    'PBXShellScriptBuildPhase',
    SIGNATURE_CLEANUP_PHASE_NAME,
    findApplicationTargetUuid(project),
    {
      shellPath: '/bin/sh',
      shellScript: 'rm -rf "$CONFIGURATION_BUILD_DIR/ArcGIS.xcframework-ios.signature"',
    }
  );
  phase.buildPhase.alwaysOutOfDate = 1;
}

const withArcGISFlattenedModuleMaps: ConfigPlugin = (config) =>
  withPodfile(config, (cfg) => {
    cfg.modResults.contents = addFlattenedModuleMapFix(cfg.modResults.contents);
    return cfg;
  });

const MODULE_MAP_FIX_BEGIN =
  '# @generated begin expo-arcgis-flattened-modulemaps - expo prebuild (DO NOT MODIFY)';
const MODULE_MAP_FIX_END = '# @generated end expo-arcgis-flattened-modulemaps';
const MODULE_MAP_FIX = [
  '# React Native 0.88 builds a static pod with Swift package dependencies (`spm_dependency`, as',
  '# ExpoArcgis has for the ArcGIS SDK) into the shared products dir, which moves its module map from',
  "# <Pod>/<Pod>.modulemap to <Pod>.modulemap. It rewrites the app's xcconfigs to match but not other",
  "# pods', so a pod built on ExpoArcgis (expo-arcgis-toolkit, …) can't find ExpoArcgis.modulemap.",
  'flattened_pods = installer.pods_project.targets.select do |target|',
  "  target.build_configurations.any? { |c| c.build_settings['CONFIGURATION_BUILD_DIR'] == '${PODS_CONFIGURATION_BUILD_DIR}' }",
  'end.map(&:name)',
  "Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', '*', '*.xcconfig')).each do |xcconfig|",
  '  contents = File.read(xcconfig)',
  '  fixed = flattened_pods.reduce(contents) do |acc, pod|',
  '    acc.gsub("${PODS_CONFIGURATION_BUILD_DIR}/#{pod}/#{pod}.modulemap", "${PODS_CONFIGURATION_BUILD_DIR}/#{pod}.modulemap")',
  '  end',
  '  File.write(xcconfig, fixed) unless fixed == contents',
  'end',
];

/**
 * Adds, right after the Podfile's `react_native_post_install(...)` call, the rewrite React Native
 * 0.88 leaves out: the module-map paths of pods it builds into the shared products dir, in the
 * xcconfigs of the pods that depend on them. A no-op with earlier React Native, which flattens
 * nothing. Replaces an earlier copy; leaves a Podfile without the call untouched. Exported for tests.
 */
export function addFlattenedModuleMapFix(podfile: string): string {
  const earlier = new RegExp(
    `\\n[ \\t]*${escapeRegExp(MODULE_MAP_FIX_BEGIN)}[\\s\\S]*?${escapeRegExp(MODULE_MAP_FIX_END)}`
  );
  podfile = podfile.replace(earlier, '');

  const call = podfile.indexOf('react_native_post_install(');
  if (call === -1) return podfile;
  // The call's matching parenthesis (its arguments contain calls of their own), then its line end.
  let depth = 0;
  let close = -1;
  for (let i = call; i < podfile.length && close === -1; i++) {
    if (podfile[i] === '(') depth++;
    else if (podfile[i] === ')' && --depth === 0) close = i;
  }
  if (close === -1) return podfile;
  const lineEnd = podfile.indexOf('\n', close);
  const at = lineEnd === -1 ? podfile.length : lineEnd;
  const indent = /^[ \t]*/.exec(podfile.slice(podfile.lastIndexOf('\n', call) + 1))![0];
  const block = [MODULE_MAP_FIX_BEGIN, ...MODULE_MAP_FIX, MODULE_MAP_FIX_END]
    .map((line) => indent + line)
    .join('\n');
  return `${podfile.slice(0, at)}\n${block}${podfile.slice(at)}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds the application target (falls back to the first target). */
function findApplicationTargetUuid(project: XcodeProject): string {
  const nativeTargets = project.hash.project.objects.PBXNativeTarget || {};
  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith('_comment')) continue;
    const productType = String(nativeTargets[key].productType || '').replace(/"/g, '');
    if (productType === 'com.apple.product-type.application') {
      return key;
    }
  }
  return project.getFirstTarget().uuid;
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
