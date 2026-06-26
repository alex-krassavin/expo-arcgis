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
      customCss: ['./src/styles/theme.css'],
      components: {
        Header: './src/components/Header.astro',
      },
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
          },
        },
      ],
      expressiveCode: {
        themes: ['github-dark'],
        styleOverrides: {
          borderRadius: '8px',
          borderColor: 'rgba(14, 30, 26, 0.16)',
          codeBackground: '#0c1316',
          frames: {
            editorBackground: '#0c1316',
            terminalBackground: '#0c1316',
            editorActiveTabBackground: '#0e171b',
            editorTabBarBackground: '#0e171b',
            terminalTitlebarBackground: '#0e171b',
            editorActiveTabIndicatorBottomColor: '#0e9c8e',
            frameBoxShadowCssValue: 'none',
          },
        },
      },
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
