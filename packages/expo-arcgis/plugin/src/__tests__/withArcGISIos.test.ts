import * as path from 'path';
import * as xcode from 'xcode';

import {
  addFlattenedModuleMapFix,
  addSignatureCleanupPhase,
  embedArcGISFramework,
} from '../withArcGISIos';

// Expo template project (app target with Sources/Frameworks/Resources) plus a tail
// "Upload dSYMs to Datadog" script phase like the one expo-datadog appends.
const FIXTURE = path.join(__dirname, 'fixtures', 'project.pbxproj');

function parseFixture() {
  const project = xcode.project(FIXTURE);
  project.parseSync();
  return project;
}

function appTargetPhaseComments(project: any): string[] {
  const objects = project.hash.project.objects;
  const targets = objects.PBXNativeTarget;
  const targetUuid = Object.keys(targets).find((key) => !key.endsWith('_comment'))!;
  return targets[targetUuid].buildPhases.map((phase: any) => phase.comment);
}

describe(embedArcGISFramework, () => {
  it('adds an Embed Frameworks phase with the ArcGIS framework signed on copy', () => {
    const project = parseFixture();
    embedArcGISFramework(project);

    const objects = project.hash.project.objects;
    const copyPhases = objects.PBXCopyFilesBuildPhase;
    const phaseUuid = Object.keys(copyPhases).find((key) => !key.endsWith('_comment'))!;
    const phase = copyPhases[phaseUuid];
    expect(phase.name).toMatch(/Embed Frameworks/);
    expect(String(phase.dstSubfolderSpec)).toBe('10');
    expect(phase.files).toHaveLength(1);

    const buildFile = objects.PBXBuildFile[phase.files[0].value];
    expect(buildFile.settings.ATTRIBUTES).toEqual(['CodeSignOnCopy', 'RemoveHeadersOnCopy']);
    const fileRef = objects.PBXFileReference[buildFile.fileRef];
    expect(fileRef.name).toBe('ArcGIS.framework');
    expect(fileRef.sourceTree).toBe('BUILT_PRODUCTS_DIR');
  });

  it('places the embed phase after Resources, before tail script phases', () => {
    // Appending instead would gate the embed copy on the dSYM-upload script phase,
    // whose dSYM input needs the finished .app — a build dependency cycle
    // ("Cycle inside <target>") that fails release builds.
    const project = parseFixture();
    embedArcGISFramework(project);

    const comments = appTargetPhaseComments(project);
    const embedIndex = comments.indexOf('Embed Frameworks');
    expect(embedIndex).toBe(comments.indexOf('Resources') + 1);
    expect(embedIndex).toBeLessThan(comments.indexOf('Upload dSYMs to Datadog'));
  });

  it('is idempotent across repeated prebuild runs', () => {
    const project = parseFixture();
    embedArcGISFramework(project);
    const after = appTargetPhaseComments(project);

    embedArcGISFramework(project);
    expect(appTargetPhaseComments(project)).toEqual(after);
    expect(after.filter((comment) => comment === 'Embed Frameworks')).toHaveLength(1);
  });
});

describe(addSignatureCleanupPhase, () => {
  // Both the app target and the ExpoArcgis pod target collect the signed xcframework's
  // signature; archive-time aggregation then copies both into Signatures/ and fails with
  // "ArcGIS.xcframework-ios.signature couldn't be copied … File exists" (exit 70).
  const PHASE_NAME = '[expo-arcgis] Remove duplicate ArcGIS.xcframework signature';

  function findPhase(project: any) {
    const scriptPhases = project.hash.project.objects.PBXShellScriptBuildPhase;
    const uuid = Object.keys(scriptPhases).find(
      (key) => !key.endsWith('_comment') && String(scriptPhases[key].name).includes(PHASE_NAME)
    );
    return uuid ? scriptPhases[uuid] : undefined;
  }

  it('adds a run-always script phase that deletes the app-level signature copy', () => {
    const project = parseFixture();
    addSignatureCleanupPhase(project);

    const phase = findPhase(project);
    expect(phase).toBeDefined();
    expect(phase.shellScript).toContain('ArcGIS.xcframework-ios.signature');
    expect(phase.shellScript).toContain('CONFIGURATION_BUILD_DIR');
    expect(String(phase.alwaysOutOfDate)).toBe('1');

    const comments = appTargetPhaseComments(project);
    expect(comments.filter((comment) => comment.includes(PHASE_NAME))).toHaveLength(1);
  });

  it('is idempotent across repeated prebuild runs', () => {
    const project = parseFixture();
    addSignatureCleanupPhase(project);
    addSignatureCleanupPhase(project);

    const comments = appTargetPhaseComments(project);
    expect(comments.filter((comment) => comment.includes(PHASE_NAME))).toHaveLength(1);
  });
});

describe(addFlattenedModuleMapFix, () => {
  // The post_install block of Expo's Podfile template (SDK 56–58).
  const PODFILE = [
    "target 'App' do",
    '  post_install do |installer|',
    '    react_native_post_install(',
    '      installer,',
    '      config[:reactNativePath],',
    '      :mac_catalyst_enabled => false,',
    '      :ccache_enabled => ccache_enabled?(podfile_properties),',
    '    )',
    '  end',
    'end',
    '',
  ].join('\n');

  it('rewrites the flattened module maps right after react_native_post_install', () => {
    const lines = addFlattenedModuleMapFix(PODFILE).split('\n');
    const callEnd = lines.indexOf('    )');
    expect(lines[callEnd + 1]).toMatch(/^ {4}# @generated begin expo-arcgis-flattened-modulemaps/);
    const blockEnd = lines.findIndex((l) =>
      l.includes('@generated end expo-arcgis-flattened-modulemaps')
    );
    // Inside post_install: the block closes before the hook's `end`.
    expect(lines[blockEnd + 1]).toBe('  end');
    expect(lines.slice(callEnd + 1, blockEnd).join('\n')).toContain(
      'acc.gsub("${PODS_CONFIGURATION_BUILD_DIR}/#{pod}/#{pod}.modulemap", "${PODS_CONFIGURATION_BUILD_DIR}/#{pod}.modulemap")'
    );
  });

  it('adds the block once however often prebuild runs', () => {
    const once = addFlattenedModuleMapFix(PODFILE);
    expect(addFlattenedModuleMapFix(once)).toBe(once);
  });

  it('leaves a Podfile without react_native_post_install alone', () => {
    const podfile = "target 'App' do\n  post_install do |installer|\n  end\nend\n";
    expect(addFlattenedModuleMapFix(podfile)).toBe(podfile);
  });
});
