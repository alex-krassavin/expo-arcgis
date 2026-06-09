// Generates one Starlight sample page per entry in example/samples.catalog.json. Each page embeds
// the REAL example source via a Vite `?raw` import (single source of truth, no drift). Runs before
// `astro dev` / `astro build` (see the docs package.json `predev` / `prebuild` hooks).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // docs/scripts
const docsRoot = join(here, '..'); // docs
const catalogPath = join(docsRoot, '..', 'example', 'samples.catalog.json');
const outDir = join(docsRoot, 'src', 'content', 'docs', 'samples');

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const { slug, title, description } of catalog) {
  const name = slug.split('/')[1];
  // From docs/src/content/docs/samples/<name>.mdx up to the repo root, then into example/app/.
  const importPath = `../../../../../example/app/${slug}.tsx?raw`;
  const mdx = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

import { Code } from '@astrojs/starlight/components';
import source from ${JSON.stringify(importPath)};

${description} This is the real source of the example app's \`${name}\` screen — run it on a device
or simulator to see it live.

<Code code={source} lang="tsx" title=${JSON.stringify(`app/${slug}.tsx`)} />
`;
  await writeFile(join(outDir, `${name}.mdx`), mdx, 'utf8');
}

console.log(`Generated ${catalog.length} sample pages → ${outDir}`);
