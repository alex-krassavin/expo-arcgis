#!/usr/bin/env node
// Builds expo-arcgis inside a fresh consumer app for one Expo SDK — the way users get it.
//
//   node internal/module_scripts/native-harness.js --sdk 58 --platform android
//   node internal/module_scripts/native-harness.js --sdk 57 --platform ios --spm-cache ~/spm-cache
//   node internal/module_scripts/native-harness.js --sdk 56 --platform js
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
//   node internal/module_scripts/native-harness.js --codeql --platform android
//
// `--codeql` is the build behind a CodeQL database (.github/workflows/codeql.yml). The app links
// this checkout instead of a packed copy, so the compilers — and so the alerts — see the repository's
// own paths; a copy under node_modules would put every alert on a file the repository doesn't have.
// Every compile is also forced to run where CodeQL's tracer sees it.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APP_ID = 'dev.expoarcgis.harness';

function parseArgs(argv) {
  const args = { dir: path.join(os.tmpdir(), 'expo-arcgis-harness') };
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
    const sdk = require(path.join(ROOT, 'node_modules/expo/package.json')).version.split('.')[0];
    if (args.sdk !== undefined && args.sdk !== sdk) {
      console.error(`--codeql builds against this repository's own Expo SDK (${sdk}).`);
      process.exit(1);
    }
    args.sdk = sdk;
  }
  if (
    !/^\d+$/.test(args.sdk ?? '') ||
    !['android', 'ios', 'js'].includes(args.platform) ||
    (args.codeql && args.platform === 'js')
  ) {
    console.error(
      'Usage: native-harness.js --sdk <N> --platform android|ios|js [--dir <work dir>] ' +
        '[--tarball <expo-arcgis.tgz>] [--spm-cache <dir>]\n' +
        '       native-harness.js --codeql --platform android|ios [--dir <work dir>] ' +
        '[--spm-cache <dir>]'
    );
    process.exit(1);
  }
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

function pack(dir) {
  const out = run('npm', ['pack', '--pack-destination', dir], { cwd: ROOT, capture: true });
  return path.join(dir, out.trim().split('\n').pop().trim());
}

function createApp(appDir, sdk, moduleSource) {
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
  // A tarball installs as a copy. The checkout (--codeql) installs as a symlink — npm's default for
  // a directory, pinned here — which autolinking resolves to the repository's real path.
  const link = fs.statSync(moduleSource).isDirectory() ? ['--install-links=false'] : [];
  run('npm', ['install', '--no-audit', '--no-fund', ...link, moduleSource], { cwd: appDir });

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

function buildAndroid(appDir, codeql) {
  run('npx', ['expo', 'prebuild', '-p', 'android', '--no-install'], { cwd: appDir });
  const gradleArgs = [':expo-arcgis:compileDebugKotlin'];
  if (process.env.CI || codeql) gradleArgs.push('--no-daemon');
  // A Kotlin file reaches the CodeQL database only through a kotlinc run the tracer sees: no task
  // may be up to date or come from a cache, and kotlinc stays inside the traced Gradle process
  // instead of a Kotlin daemon that an earlier, untraced build may have left running.
  if (codeql) gradleArgs.push('--rerun-tasks', '-Pkotlin.compiler.execution.strategy=in-process');
  run('./gradlew', gradleArgs, { cwd: path.join(appDir, 'android') });
}

function buildIos(appDir, spmCache, codeql) {
  run('npx', ['expo', 'prebuild', '-p', 'ios', '--no-install'], { cwd: appDir });
  const iosDir = path.join(appDir, 'ios');
  // CocoaPods aborts on a non-UTF-8 locale.
  const utf8 = { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' };
  run('pod', ['install'], { cwd: iosDir, env: utf8 });
  const workspace = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcworkspace'));
  const xcodeArgs = [
    '-workspace',
    workspace,
    '-scheme',
    'ExpoArcgis',
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
      // Fresh DerivedData: a file that is already up to date isn't compiled, so isn't extracted.
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
  run('xcodebuild', [...xcodeArgs, 'build'], { cwd: iosDir, env: utf8 });
}

// Enough of the API to make the typecheck and the bundle reach the library's main entry points.
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

export default function App() {
  const view = useRef<MapViewHandle>(null);
  const area = geometryEngine.buffer({ type: 'point', x: 0, y: 0 }, 1000);
  return (
    <MapView ref={view} style={{ flex: 1 }} onTap={() => view.current?.getCenter()}>
      <Map basemap="arcGISTopographic">
        <FeatureLayer url="https://services.arcgis.com/example/FeatureServer/0" />
      </Map>
      <GraphicsOverlay>{area && <Graphic geometry={area} />}</GraphicsOverlay>
    </MapView>
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

const args = parseArgs(process.argv.slice(2));
fs.mkdirSync(args.dir, { recursive: true });
const moduleSource = args.codeql
  ? ROOT
  : args.tarball
    ? path.resolve(args.tarball)
    : pack(args.dir);
const appDir = path.join(args.dir, `sdk${args.sdk}-${args.platform}`);
createApp(appDir, args.sdk, moduleSource);

if (args.platform === 'android') buildAndroid(appDir, args.codeql);
else if (args.platform === 'ios') buildIos(appDir, args.spmCache, args.codeql);
else buildJs(appDir);

console.log(`\n✓ expo-arcgis ${args.platform} build passed against Expo SDK ${args.sdk}`);
