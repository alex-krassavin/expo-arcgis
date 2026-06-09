// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

// Build the Samples sidebar from the same catalog that drives the example gallery + page generator,
// grouped by category in catalog order (labels and titles come straight from the catalog).
const catalog = JSON.parse(
  readFileSync(new URL('../example/samples.catalog.json', import.meta.url), 'utf8')
);
const sampleGroups = [];
for (const { slug, title, category } of catalog) {
  let group = sampleGroups.find((g) => g.label === category);
  if (!group) {
    group = { label: category, items: [] };
    sampleGroups.push(group);
  }
  group.items.push({ label: title, slug: `samples/${slug.split('/')[1]}` });
}

// Served from GitHub Pages at https://alex-krassavin.github.io/expo-arcgis/
export default defineConfig({
  site: 'https://alex-krassavin.github.io',
  base: '/expo-arcgis',
  integrations: [
    starlight({
      title: 'expo-arcgis',
      description: 'Native ArcGIS Maps SDK for React Native, as an Expo module.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/alex-krassavin/expo-arcgis',
        },
      ],
      plugins: [
        // Generates the API Reference under src/content/docs/api/ from the module's typed source.
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.json',
          typeDoc: {
            skipErrorChecking: true,
            excludeInternal: true,
          },
        }),
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting started', slug: 'guides/getting-started' },
            { label: 'Concepts', slug: 'guides/concepts' },
          ],
        },
        { label: 'Samples', items: sampleGroups },
        typeDocSidebarGroup,
      ],
    }),
  ],
  // Allow importing example sample sources (outside docs/) as raw text for code blocks.
  vite: {
    server: { fs: { allow: ['..'] } },
  },
});
