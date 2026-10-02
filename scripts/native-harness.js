#!/usr/bin/env node
// Builds expo-arcgis inside a fresh consumer app for one Expo SDK — the way users get it.
//
//   node scripts/native-harness.js --sdk 58 --platform android
//   node scripts/native-harness.js --sdk 57 --platform ios --spm-cache ~/spm-cache
//   node scripts/native-harness.js --sdk 56 --platform js
//
// The module is packed with `npm pack` (only what npm would publish) and installed into a new
// `blank-typescript@sdk-N` app, whose native projects then come from `expo prebuild` — so the
// config plugin, the published file list and the native sources are all exercised against that
// SDK's own template, React Native and expo-modules-core. `example/` can't do this: it is pinned to
// one SDK.
//
// Platforms: `android` compiles the module's Kotlin, `ios` compiles its Swift (ExpoArcgis scheme),
// `js` typechecks and bundles an app that imports the library.
//
// The core is packages/expo-arcgis. The packages released next to it (the rest of packages/*, e.g.
// expo-arcgis-toolkit) are Expo modules built on it. They are packed and installed with the core,
// and their native code compiles too.
//
//   node scripts/native-harness.js --codeql --platform android
//
// `--codeql` is the build behind a CodeQL database (.github/workflows/codeql.yml). The app links
// the packages in this checkout instead of packed copies, so the compilers — and so the alerts —
// see the repository's own paths; a copy under node_modules would put every alert on a file the
// repository doesn't have.
// Every compile is also forced to run where CodeQL's tracer sees it.
//
//   node scripts/native-harness.js --codeql --platform ios --reuse-app
//
// `--reuse-app` (iOS) recompiles only the modules' own Swift, in the app the previous --codeql run
// left in --dir. That run records each module's swiftc command from its xcodebuild log; this one
// replays them, with no xcodebuild. CodeQL's Swift job runs the harness once before the tracer
// starts, then traces only the replay. Under the tracer, xcodebuild rebuilt every dependency and
// never got through Esri's Toolkit package.
const { execFileSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CORE = path.join(ROOT, 'packages', 'expo-arcgis');
const APP_ID = 'dev.expoarcgis.harness';

/** The packages built on the core (the rest of packages/*): their directories and npm names. */
const PACKAGES = fs
  .readdirSync(path.join(ROOT, 'packages'))
  .map((dir) => path.join(ROOT, 'packages', dir))
  .filter((dir) => dir !== CORE && fs.existsSync(path.join(dir, 'package.json')))
  .map((dir) => ({ dir, name: require(path.join(dir, 'package.json')).name }));

/** The CocoaPods pods a module directory declares (`ios/<Pod>.podspec`). */
function podsIn(dir) {
  const iosDir = path.join(dir, 'ios');
  return fs.existsSync(iosDir)
    ? fs
        .readdirSync(iosDir)
        .filter((file) => file.endsWith('.podspec'))
        .map((file) => path.basename(file, '.podspec'))
    : [];
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
    // An option followed by another option, or by nothing, is a switch.
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) args[key] = true;
    else args[key] = argv[++i];
  }
  if (args.codeql) {
    // A linked checkout resolves its own imports — the config plugin's `expo/config-plugins`, the
    // peers autolinking walks — from this repository's node_modules, so the app has to be on the
    // same SDK.
    const expo = require(require.resolve('expo/package.json', { paths: [CORE] }));
    const sdk = expo.version.split('.')[0];
    if (args.sdk !== undefined && args.sdk !== sdk) {
      console.error(`--codeql builds against this repository's own Expo SDK (${sdk}).`);
      process.exit(1);
    }
    args.sdk = sdk;
  }
  if (
    !/^\d+$/.test(args.sdk ?? '') ||
    !['android', 'ios', 'js'].includes(args.platform) ||
    (args.codeql && args.platform === 'js') ||
    (args.reuseApp && (!args.codeql || args.platform !== 'ios' || !args.dir))
  ) {
    console.error(
      'Usage: native-harness.js --sdk <N> --platform android|ios|js [--dir <work dir>] ' +
        '[--tarball <expo-arcgis.tgz>] [--spm-cache <dir>]\n' +
        '       native-harness.js --codeql --platform android|ios [--dir <work dir>] ' +
        '[--spm-cache <dir>] [--reuse-app]'
    );
    process.exit(1);
  }
  // Without --dir, a fresh private directory: a fixed path under the shared temp dir is one another
  // user could create first, and own.
  args.dir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'expo-arcgis-harness-'));
  return args;
}

function run(cmd, args, options = {}) {
  console.log(`\n$ ${[cmd, ...args].join(' ')}${options.cwd ? `   (in ${options.cwd})` : ''}`);
  return execFileSync(cmd, args, {
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    ...options,
    env: { ...process.env, CI: '1', EXPO_NO_GIT_STATUS: '1', ...options.env },
  });
}

/** Packs the package in `source` into `dir`; returns the tarball's path. */
/** Runs a command like `run`, showing its output live and also writing it to `log`. No shell. */
function runLogged(cmd, args, log, options = {}) {
  console.log(`\n$ ${[cmd, ...args].join(' ')}   (in ${options.cwd}, log: ${log})`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(log);
    const child = spawn(cmd, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', EXPO_NO_GIT_STATUS: '1', ...options.env },
    });
    const forward = (out) => (chunk) => {
      out.write(chunk);
      file.write(chunk);
    };
    child.stdout.on('data', forward(process.stdout));
    child.stderr.on('data', forward(process.stderr));
    child.on('error', reject);
    child.on('close', (code) =>
      file.end(() => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code} (${log})`))))
    );
  });
}

function pack(source, dir) {
  const out = run('npm', ['pack', '--pack-destination', dir], { cwd: source, capture: true });
  return path.join(dir, out.trim().split('\n').pop().trim());
}

function createApp(appDir, sdk, moduleSources) {
  fs.rmSync(appDir, { recursive: true, force: true });
  run('npx', [
    '--yes',
    'create-expo-app@latest',
    appDir,
    '--template',
    `blank-typescript@sdk-${sdk}`,
    '--no-install',
    '--no-agents-md',
  ]);
  run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir });
  // One install, so each package's `expo-arcgis` peer resolves to the core installed with it. A
  // tarball installs as a copy. The checkout (--codeql) installs as symlinks — npm's default for a
  // directory, pinned here — which autolinking resolves to the repository's real paths. Without
  // scripts: npm would run every linked package's `prepare` at once, and the core's empties build/
  // while the toolkit's compiles against it. Both were built by `npm ci` at the root already.
  const link = fs.statSync(moduleSources[0]).isDirectory()
    ? ['--install-links=false', '--ignore-scripts']
    : [];
  run('npm', ['install', '--no-audit', '--no-fund', ...link, ...moduleSources], { cwd: appDir });

  const appJsonPath = path.join(appDir, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.expo.ios = { ...appJson.expo.ios, bundleIdentifier: APP_ID };
  appJson.expo.android = { ...appJson.expo.android, package: APP_ID };
  appJson.expo.plugins = [...(appJson.expo.plugins ?? []), 'expo-arcgis'];
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

  const installed = require(path.join(appDir, 'node_modules/expo/package.json')).version;
  const rn = require(path.join(appDir, 'node_modules/react-native/package.json')).version;
  console.log(`\nHarness app: Expo ${installed}, React Native ${rn}`);
}

// React Native pins an NDK that GitHub's runner image doesn't carry, so the Android Gradle plugin
// downloads it (~1 GB) in the middle of the build, and a broken download fails the job: "Archive is
// not a ZIP archive". Install it up front instead, with retries. A machine that has it skips this.
function installNdk(appDir) {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const catalog = path.join(appDir, 'node_modules/react-native/gradle/libs.versions.toml');
  const version = fs.existsSync(catalog)
    ? fs.readFileSync(catalog, 'utf8').match(/^ndkVersion\s*=\s*"([^"]+)"/m)?.[1]
    : undefined;
  const sdkmanager = sdkRoot && path.join(sdkRoot, 'cmdline-tools/latest/bin/sdkmanager');
  if (!version || !sdkmanager || !fs.existsSync(sdkmanager)) return;
  if (fs.existsSync(path.join(sdkRoot, 'ndk', version))) return;
  for (let attempt = 1; ; attempt++) {
    try {
      // `input` answers the license prompt.
      run(sdkmanager, ['--install', `ndk;${version}`], {
        input: 'y\n'.repeat(5),
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`sdkmanager could not install ndk;${version} (attempt ${attempt} of 3), retrying`);
    }
  }
}

function buildAndroid(appDir, codeql) {
  run('npx', ['expo', 'prebuild', '-p', 'android', '--no-install'], { cwd: appDir });
  installNdk(appDir);
  // Autolinking names each module's Gradle project after its npm package.
  const gradleArgs = ['expo-arcgis', ...PACKAGES.map((pkg) => pkg.name)].map(
    (project) => `:${project}:compileDebugKotlin`
  );
  if (process.env.CI || codeql) gradleArgs.push('--no-daemon');
  if (codeql) {
    gradleArgs.push(
      // A Kotlin file reaches the CodeQL database only through a kotlinc run the tracer sees, so no
      // task may be up to date or come from a cache.
      '--rerun-tasks',
      // CodeQL's extractor runs as a kotlinc plugin inside the Kotlin daemon, which inherits these
      // settings. The template's 2 GiB heap / 512 MiB metaspace is sized for the compile alone
      // (github/codeql#19374).
      '-Dorg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g'
    );
  }
  run('./gradlew', gradleArgs, { cwd: path.join(appDir, 'android') });
}

async function buildIos(appDir, spmCache, codeql, reuse) {
  const iosDir = path.join(appDir, 'ios');
  // CocoaPods aborts on a non-UTF-8 locale.
  const utf8 = { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' };
  // Each module's pod has a scheme of its own: the core's first, then the packages built on it.
  const pods = [CORE, ...PACKAGES.map((pkg) => pkg.dir)].flatMap(podsIn);
  if (reuse) {
    replaySwiftCompiles(appDir);
    return;
  }
  run('npx', ['expo', 'prebuild', '-p', 'ios', '--no-install'], { cwd: appDir });
  run('pod', ['install'], { cwd: iosDir, env: utf8 });
  const workspace = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
  const xcodeArgs = [
    '-workspace',
    workspace,
    '-sdk',
    'iphonesimulator',
    '-configuration',
    'Debug',
    '-destination',
    'generic/platform=iOS Simulator',
    'CODE_SIGNING_ALLOWED=NO',
  ];
  if (spmCache) xcodeArgs.push('-clonedSourcePackagesDirPath', spmCache);
  if (codeql) {
    xcodeArgs.push(
      // The app's own, fresh DerivedData: a file that is already up to date isn't compiled, so
      // isn't extracted.
      '-derivedDataPath',
      path.join(appDir, 'DerivedData'),
      // What CodeQL's own Swift autobuilder passes, so every file goes through a swift-frontend
      // run the tracer sees.
      'COMPILATION_CACHE_ENABLE_CACHING=NO',
      'SWIFT_ENABLE_COMPILE_CACHE=NO',
      'SWIFT_USE_INTEGRATED_DRIVER=NO',
      // One architecture, so each file is compiled and extracted once.
      `ARCHS=${process.arch === 'x64' ? 'x86_64' : 'arm64'}`
    );
  }
  run('xcodebuild', ['-version'], { cwd: iosDir });
  const compiles = {};
  for (const scheme of pods) {
    const args = [...xcodeArgs, '-scheme', scheme, 'build'];
    if (!codeql) {
      run('xcodebuild', args, { cwd: iosDir, env: utf8 });
      continue;
    }
    // Keep the log: it holds the swiftc command of each module's Swift compile, for --reuse-app.
    const log = path.join(appDir, `xcodebuild-${scheme}.log`);
    await runLogged('xcodebuild', args, log, { cwd: iosDir, env: utf8 });
    Object.assign(compiles, swiftCompilesIn(fs.readFileSync(log, 'utf8'), pods));
  }
  if (codeql) {
    const missing = pods.filter((pod) => !compiles[pod]);
    if (missing.length > 0) {
      throw new Error(`No CompileSwiftSources task for ${missing.join(', ')} in the xcodebuild logs`);
    }
    fs.writeFileSync(path.join(appDir, SWIFT_COMPILES), JSON.stringify(compiles, null, 2));
  }
}

/** Where a --codeql iOS build records its modules' swiftc commands for --reuse-app. */
const SWIFT_COMPILES = 'codeql-swift-compiles.json';

/**
 * The `CompileSwiftSources` tasks of the given Pods targets in an xcodebuild log. With
 * SWIFT_USE_INTEGRATED_DRIVER=NO, xcodebuild prints each one as the task line, then indented, in
 * shell syntax: a `cd`, sometimes `export`s, and one swiftc command.
 */
function swiftCompilesIn(log, targets) {
  const compiles = {};
  const lines = log.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const task = lines[i].match(
      /^CompileSwiftSources normal \S+ com\.apple\.xcode\.tools\.swift\.compiler \(in target '([^']+)' from project 'Pods'\)/
    );
    if (!task || !targets.includes(task[1])) continue;
    const script = [];
    for (let j = i + 1; j < lines.length && lines[j].startsWith('    '); j++) {
      script.push(lines[j].slice(4));
    }
    compiles[task[1]] = script.join('\n');
  }
  return compiles;
}

/**
 * Recompiles the modules' own Swift with the swiftc commands the previous --codeql run recorded,
 * against the modules and products it built. No xcodebuild: under CodeQL's tracer it rebuilt every
 * dependency, from React Native's codegen to Esri's Toolkit package.
 */
function replaySwiftCompiles(appDir) {
  const recorded = path.join(appDir, SWIFT_COMPILES);
  if (!fs.existsSync(recorded)) {
    throw new Error(`--reuse-app needs a previous --codeql iOS run in the same --dir (${recorded})`);
  }
  // swiftc compiles incrementally: marking every module source as changed recompiles them all.
  const now = new Date();
  for (const file of moduleSourceFiles('ios', '.swift')) fs.utimesSync(file, now, now);
  for (const [target, script] of Object.entries(JSON.parse(fs.readFileSync(recorded, 'utf8')))) {
    const { cwd, env, argv } = recordedCommand(script);
    if (path.basename(argv[0] ?? '') !== 'swiftc') {
      throw new Error(`The recorded compile of ${target} doesn't run swiftc:\n${script}`);
    }
    console.log(`\n$ ${argv.join(' ')}   (in ${cwd}; ${target}, recorded by the previous run)`);
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    if (result.status !== 0) throw new Error(`The recorded swiftc command for ${target} failed`);
  }
}

/**
 * A recorded xcodebuild task as a process: the directory of its `cd`, its `export`s and its command
 * split into arguments. xcodebuild escapes with backslashes, never quotes, so no shell is needed.
 */
function recordedCommand(script) {
  const words = (line) =>
    (line.match(/(?:\\.|[^\s\\])+/g) ?? []).map((word) => word.replace(/\\(.)/g, '$1'));
  const command = { cwd: undefined, env: {}, argv: [] };
  for (const line of script.split('\n')) {
    const [first, ...rest] = words(line);
    if (first === undefined) continue;
    if (first === 'cd') command.cwd = rest.join(' ');
    else if (first === 'export') {
      const [name, ...value] = rest.join(' ').split('=');
      command.env[name] = value.join('=');
    } else command.argv = [first, ...rest];
  }
  return command;
}

// Enough of the API to make the typecheck and the bundle reach the library's main entry points,
// and those of the packages built on it.
const APP_TSX = `import { useRef } from 'react';
import {
  FeatureLayer,
  Graphic,
  GraphicsOverlay,
  Map,
  MapView,
  type MapViewHandle,
  geometryEngine,
} from 'expo-arcgis';
import { BasemapGallery, Compass, Scalebar } from 'expo-arcgis-toolkit';

export default function App() {
  const view = useRef<MapViewHandle>(null);
  const area = geometryEngine.buffer({ type: 'point', x: 0, y: 0 }, 1000);
  return (
    <Map basemap="arcGISTopographic">
      <MapView ref={view} style={{ flex: 1 }} onTap={() => view.current?.getCenter()}>
        <FeatureLayer url="https://services.arcgis.com/example/FeatureServer/0" />
        <GraphicsOverlay>{area && <Graphic geometry={area} />}</GraphicsOverlay>
        <Compass autoHide={false} />
        <Scalebar units="metric" style="line" />
      </MapView>
      <BasemapGallery style={{ height: 240 }} />
    </Map>
  );
}
`;

function buildJs(appDir) {
  fs.writeFileSync(path.join(appDir, 'App.tsx'), APP_TSX);
  run('npx', ['tsc', '--noEmit'], { cwd: appDir });
  run('npx', ['expo', 'export', '--platform', 'android', '--output-dir', 'dist'], {
    cwd: appDir,
  });
}

/** The `ext` files under `sourceDir` (e.g. `ios`) of the core and every package. */
function moduleSourceFiles(sourceDir, ext) {
  return [CORE, ...PACKAGES.map((pkg) => pkg.dir)].flatMap((dir) => {
    const root = path.join(dir, sourceDir);
    return fs.existsSync(root)
      ? fs
          .readdirSync(root, { recursive: true })
          .filter((file) => file.endsWith(ext))
          .map((file) => path.join(root, file))
      : [];
  });
}

// Under CodeQL's tracer (after codeql-action/init), a compile the tracer misses fails nothing:
// CodeQL just analyzes less and still reports a clean result. Each extracted file is copied into the
// database's source archive at its absolute path, so check that every module source is there.
function checkCodeqlExtraction(platform) {
  const [language, sourceDir, ext] =
    platform === 'android' ? ['Kotlin', 'android/src', '.kt'] : ['Swift', 'ios', '.swift'];
  const archive =
    process.env[`CODEQL_EXTRACTOR_${platform === 'android' ? 'JAVA' : 'SWIFT'}_SOURCE_ARCHIVE_DIR`];
  if (!archive) {
    console.log(`\nNot running under CodeQL: no ${language} extraction to check.`);
    return;
  }
  const filesIn = (dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { recursive: true })
          .filter((file) => file.endsWith(ext))
          .map((file) => path.join(dir, file))
      : [];
  const sources = moduleSourceFiles(sourceDir, ext);
  const missing = sources.filter(
    (file) => !fs.existsSync(path.join(archive, fs.realpathSync(file)))
  );
  if (missing.length > 0) {
    console.error(
      `\n✗ CodeQL extracted ${sources.length - missing.length} of the module's ${sources.length} ` +
        `${language} sources. Missing:\n` +
        missing.map((file) => `  ${path.relative(ROOT, file)}\n`).join('') +
        `The database holds ${filesIn(archive).length} ${ext} files in all (${archive}).`
    );
    process.exit(1);
  }
  console.log(`\n✓ CodeQL extracted all ${sources.length} of the module's ${language} sources`);
}

const args = parseArgs(process.argv.slice(2));
fs.mkdirSync(args.dir, { recursive: true });
const moduleSources = args.codeql
  ? [CORE, ...PACKAGES.map((pkg) => pkg.dir)]
  : [
      args.tarball ? path.resolve(args.tarball) : pack(CORE, args.dir),
      ...PACKAGES.map((pkg) => pack(pkg.dir, args.dir)),
    ];
const appDir = path.join(args.dir, `sdk${args.sdk}-${args.platform}`);
if (!args.reuseApp) createApp(appDir, args.sdk, moduleSources);

async function main() {
  if (args.platform === 'android') buildAndroid(appDir, args.codeql);
  else if (args.platform === 'ios') await buildIos(appDir, args.spmCache, args.codeql, args.reuseApp);
  else buildJs(appDir);

  console.log(`\n✓ expo-arcgis ${args.platform} build passed against Expo SDK ${args.sdk}`);
  if (args.codeql) checkCodeqlExtraction(args.platform);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
