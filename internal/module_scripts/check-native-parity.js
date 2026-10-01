#!/usr/bin/env node
// Fails when a function, prop, property or event is registered on one platform only.
//
// Neither `tsc` nor the native compile gates can see this: each platform builds fine on its own,
// and the missing half only surfaces as a runtime rejection on the other platform — which is how
// `getCenter` shipped Android-only in #19. The Expo module definitions are the one place both
// platforms declare what JS can call, so diffing them catches it before review has to.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SOURCES = {
  ios: path.join(ROOT, 'ios'),
  android: path.join(ROOT, 'android/src/main/java/expo/modules/arcgis'),
};
const MODULE_FILE = /^ExpoArcgis\w*Module\.(swift|kt)$/;

// Asymmetries that are on purpose. Every entry must still be present: a stale one fails the check
// as well, so this list cannot quietly outlive the code it excuses.
const OAUTH =
  'The iOS SDK presents the OAuth browser itself; on Android the app opens it, so the same flow ' +
  'is split into oauthStart/oauthComplete around the consumer-supplied callback.';
const THROWING_CONSTRUCTOR =
  'expo-modules-core on Android refuses to register a SharedObject class without a Constructor ' +
  '(crash at app start); iOS has no such rule. These refs are only ever created natively, so the ' +
  'Android constructor throws.';
const EXPECTED = {
  ios: {
    'ExpoArcgis: AsyncFunction signInWithOAuth': OAUTH,
  },
  android: {
    'ExpoArcgis: AsyncFunction oauthStart': OAUTH,
    'ExpoArcgis: AsyncFunction oauthComplete': OAUTH,
    'ExpoArcgisExtras/GeodatabaseRef: Constructor': THROWING_CONSTRUCTOR,
    'ExpoArcgisExtras/RouteTrackerRef: Constructor': THROWING_CONSTRUCTOR,
    'ExpoArcgisExtras/ServiceGeodatabaseRef: Constructor': THROWING_CONSTRUCTOR,
    'ExpoArcgisGeometry/JobRef: Constructor': THROWING_CONSTRUCTOR,
  },
};

const CONTEXT = /\b(Class|View)\((\w+)(?:\.self|::class)/;
const MEMBER = /\b(?:Static)?(AsyncFunction|Function|Prop|Property)\("([^"]+)"/g;
const MODULE_NAME = /^\s*Name\("([^"]+)"\)/;

/** Drops comments and string contents, so braces inside them don't skew the depth count. */
function code(line) {
  return line.replace(/\/\/.*$/, '').replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function count(text, pattern) {
  return (text.match(pattern) || []).length;
}

/**
 * Every registration in one platform's module definitions, as `Module/Context: Kind name` keys.
 * Class-level events are returned separately: Swift's `Class` cannot declare `Events()` (its
 * SharedObjects just `emit`), so those are matched against the Swift emit sites instead.
 */
function registrations(platform) {
  const entries = new Set();
  const classEvents = new Set();
  const dir = SOURCES[platform];
  const files = fs.readdirSync(dir).filter((f) => MODULE_FILE.test(f));
  for (const file of files.sort()) {
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
    let moduleName = null;
    let depth = 0;
    const stack = []; // { name, kind, depth } of the open Class/View blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nameMatch = line.match(MODULE_NAME);
      if (nameMatch && stack.length === 0) moduleName = nameMatch[1];

      const contextMatch = line.match(CONTEXT);
      if (!contextMatch) {
        const top = stack[stack.length - 1];
        const scope = top ? `${moduleName}/${top.name}` : moduleName;
        for (const [, kind, name] of line.matchAll(MEMBER)) {
          entries.add(`${scope}: ${kind} ${name}`);
        }
        if (/\bConstructor\b/.test(code(line))) entries.add(`${scope}: Constructor`);
        if (/\bEvents\(/.test(code(line))) {
          // Events(...) may span lines.
          let call = line.slice(line.indexOf('Events('));
          for (let j = i + 1; count(call, /\(/g) > count(call, /\)/g); j++) call += lines[j];
          for (const [, event] of call.matchAll(/"([^"]+)"/g)) {
            if (top && top.kind === 'Class') classEvents.add(`${scope}: Event ${event}`);
            else entries.add(`${scope}: Event ${event}`);
          }
        }
      }

      const text = code(line);
      if (contextMatch) stack.push({ kind: contextMatch[1], name: contextMatch[2], depth });
      depth += count(text, /\{/g) - count(text, /\}/g);
      while (stack.length && depth <= stack[stack.length - 1].depth) stack.pop();
    }
  }
  return { entries, classEvents };
}

/** Event names the Swift SharedObjects emit (`emit(event: "onX", …)`), across all of ios/. */
function swiftEmittedEvents() {
  const emitted = new Set();
  for (const file of fs.readdirSync(SOURCES.ios).filter((f) => f.endsWith('.swift'))) {
    const source = fs.readFileSync(path.join(SOURCES.ios, file), 'utf8');
    for (const [, event] of source.matchAll(/\bemit\(event:\s*"([^"]+)"/g)) emitted.add(event);
  }
  return emitted;
}

const ios = registrations('ios');
const android = registrations('android');

const onlyOn = {
  ios: [...ios.entries].filter((e) => !android.entries.has(e)),
  android: [...android.entries].filter((e) => !ios.entries.has(e)),
};

// Class events: declared on Android, emitted on iOS.
const emitted = swiftEmittedEvents();
const declared = new Set([...android.classEvents].map((e) => e.split(' ').pop()));
for (const entry of android.classEvents) {
  if (!emitted.has(entry.split(' ').pop())) onlyOn.android.push(`${entry} (never emitted on iOS)`);
}
for (const event of emitted) {
  if (!declared.has(event))
    onlyOn.ios.push(`(SharedObject): Event ${event} (not declared on Android)`);
}

const problems = [];
for (const platform of ['ios', 'android']) {
  const label = platform === 'ios' ? 'iOS' : 'Android';
  const unexpected = onlyOn[platform].filter((e) => !(e in EXPECTED[platform])).sort();
  const stale = Object.keys(EXPECTED[platform]).filter((e) => !onlyOn[platform].includes(e));
  if (unexpected.length)
    problems.push(`Registered on ${label} only:`, ...unexpected.map((e) => `  ${e}`));
  if (stale.length) {
    problems.push(
      `Listed as ${label}-only in EXPECTED, but no longer is (remove the entry):`,
      ...stale.map((e) => `  ${e}`)
    );
  }
}

if (problems.length) {
  console.error(['Native API parity check failed.', '', ...problems, ''].join('\n'));
  console.error(
    'Implement the missing half on the other platform. If the asymmetry is intentional, add it to\n' +
      'EXPECTED in internal/module_scripts/check-native-parity.js together with the reason.'
  );
  process.exit(1);
}
const shared =
  [...ios.entries].filter((e) => android.entries.has(e)).length + android.classEvents.size;
const excused = Object.keys(EXPECTED.ios).length + Object.keys(EXPECTED.android).length;
console.log(
  `Native API parity OK: ${shared} registrations on both platforms, ` +
    `${excused} intentional differences listed in EXPECTED.`
);
