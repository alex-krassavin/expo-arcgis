#!/usr/bin/env node
const { spawnSyncWithAutoShell } = require('./util');
const fs = require('fs');
const path = require('path');

const SUBTARGETS = ['plugin', 'cli', 'utils', 'scripts'];
const args = process.argv.slice(2);
const target = args[0];

let tscArgs;
if (SUBTARGETS.includes(target)) {
  const targetDir = path.join(process.cwd(), target);
  if (!fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
    console.log(`tsconfig.json not found in ${target}, skipping build for ${target}`);
    process.exit(0);
  }
  // Drop stale incremental build info first: a deleted build/ + a stale .tsbuildinfo makes
  // `tsc --build` believe the output is up to date and skip re-emitting (the long-standing
  // `rm plugin/tsconfig.tsbuildinfo` manual workaround). Removing it forces a fresh emit.
  fs.rmSync(path.join(targetDir, 'tsconfig.tsbuildinfo'), { force: true });
  tscArgs = ['--build', targetDir, ...args.slice(1)];
} else {
  tscArgs = [...args];
}

if (
  process.stdout.isTTY &&
  !process.env.CI &&
  !process.env.EXPO_NONINTERACTIVE &&
  !tscArgs.includes('--watch')
) {
  tscArgs.push('--watch');
}

const result = spawnSyncWithAutoShell('tsc', tscArgs, { stdio: 'inherit' });
process.exit(result.status ?? 0);
