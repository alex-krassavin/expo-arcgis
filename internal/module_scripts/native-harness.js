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
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APP_ID = 'dev.expoarcgis.harness';

function parseArgs(argv) {
  const args = { dir: path.join(os.tmpdir(), 'expo-arcgis-harness') };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = argv[i + 1];
  }
  if (!/^\d+$/.test(args.sdk ?? '') || !['android', 'ios', 'js'].includes(args.platform)) {
    console.error(
      'Usage: native-harness.js --sdk <N> --platform android|ios|js [--dir <work dir>] ' +
        '[--tarball <expo-arcgis.tgz>] [--spm-cache <dir>]'
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

function createApp(appDir, sdk, tarball) {
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
  run('npm', ['install', '--no-audit', '--no-fund', tarball], { cwd: appDir });

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

function buildAndroid(appDir) {
  run('npx', ['expo', 'prebuild', '-p', 'android', '--no-install'], { cwd: appDir });
  const gradleArgs = [':expo-arcgis:compileDebugKotlin'];
  if (process.env.CI) gradleArgs.push('--no-daemon');
  run('./gradlew', gradleArgs, { cwd: path.join(appDir, 'android') });
}

function buildIos(appDir, spmCache) {
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
const tarball = args.tarball ? path.resolve(args.tarball) : pack(args.dir);
const appDir = path.join(args.dir, `sdk${args.sdk}-${args.platform}`);
createApp(appDir, args.sdk, tarball);

if (args.platform === 'android') buildAndroid(appDir);
else if (args.platform === 'ios') buildIos(appDir, args.spmCache);
else buildJs(appDir);

console.log(`\n✓ expo-arcgis ${args.platform} build passed against Expo SDK ${args.sdk}`);
