#!/usr/bin/env node
const { spawnSyncWithAutoShell } = require('./util');
const fs = require('fs');
const path = require('path');

const SUBTARGETS = ['plugin', 'cli', 'utils', 'scripts'];

function run(cmd, args = []) {
  const result = spawnSyncWithAutoShell(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Clean and build main
fs.rmSync(path.join(process.cwd(), 'build'), { recursive: true, force: true });
run('tsc');

// Clean and build any existing subtargets
for (const target of SUBTARGETS) {
  const targetDir = path.join(process.cwd(), target);
  if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, 'tsconfig.json'))) {
    console.log(`Building ${target}`);
    fs.rmSync(path.join(targetDir, 'build'), { recursive: true, force: true });
    // Also drop the incremental build info: after we delete build/, a stale .tsbuildinfo makes
    // `tsc --build` think the output is up to date and skip re-emitting — leaving an EMPTY build/.
    // The published package then ships no plugin/build and consumers hit
    // `Cannot find module './plugin/build'` during `expo prebuild`. `--force` belt-and-suspenders.
    fs.rmSync(path.join(targetDir, 'tsconfig.tsbuildinfo'), { force: true });
    run('tsc', ['--build', '--force', targetDir]);
  }
}
