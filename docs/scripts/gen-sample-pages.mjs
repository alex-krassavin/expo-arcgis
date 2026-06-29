// Generates one Starlight sample page per entry in example/samples.catalog.json. Each page embeds
// the REAL example source via a Vite `?raw` import (single source of truth, no drift) and, when a
// device screenshot exists under public/samples/<name>-<platform>.jpg, a phone-framed preview.
// Runs before `astro dev` / `astro build` (see the docs package.json `predev` / `prebuild` hooks).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // docs/scripts
const docsRoot = join(here, '..'); // docs
const catalogPath = join(docsRoot, '..', 'example', 'samples.catalog.json');
const outDir = join(docsRoot, 'src', 'content', 'docs', 'samples');
const shotsDir = join(docsRoot, 'public', 'samples');
const base = '/expo-arcgis';

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// iOS first so it reads left-to-right iOS · Android, like the design.
const PLATFORMS = [
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
];

let withShots = 0;
for (const { slug, title, description } of catalog) {
  const name = slug.split('/')[1];
  // From docs/src/content/docs/samples/<name>.mdx up to the repo root, then into example/app/.
  const importPath = `../../../../../example/app/${slug}.tsx?raw`;

  const shots = PLATFORMS.filter((p) => existsSync(join(shotsDir, `${name}-${p.key}.jpg`)));
  if (shots.length) withShots++;
  const frames = shots.length
    ? `\n<div class="ea-shots not-content">\n${shots
        .map(
          (p) =>
            `  <figure class="ea-shot"><span class="ea-shot-phone"><img src="${base}/samples/${name}-${p.key}.jpg" alt=${JSON.stringify(
              `${title} running on ${p.label}`
            )} width="420" height="933" loading="lazy" /></span><figcaption>${p.label}</figcaption></figure>`
        )
        .join('\n')}\n</div>\n`
    : '';

  const mdx = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

import { Code } from '@astrojs/starlight/components';
import source from ${JSON.stringify(importPath)};

${description}
${frames}
This is the real source of the example app's \`${name}\` screen — run it on a device
or simulator to see it live.

<Code code={source} lang="tsx" title=${JSON.stringify(`app/${slug}.tsx`)} />
`;
  await writeFile(join(outDir, `${name}.mdx`), mdx, 'utf8');
}

console.log(`Generated ${catalog.length} sample pages (${withShots} with screenshots) → ${outDir}`);
