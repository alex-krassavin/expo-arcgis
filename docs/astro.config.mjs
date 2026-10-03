// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, {
  createStarlightTypeDocPlugin,
  typeDocSidebarGroup,
} from 'starlight-typedoc';

import starlightLlmsTxt from 'starlight-llms-txt';
import { OptionDefaults } from 'typedoc';

import { sampleName } from './scripts/sample-name.mjs';

// `@platform ios` marks an API that one platform lacks: TypeDoc shows it as a section of its own.
const blockTags = [...OptionDefaults.blockTags, '@platform'];

// A second API reference, for expo-arcgis-toolkit, beside the core's.
const [toolkitTypeDoc, toolkitTypeDocSidebarGroup] = createStarlightTypeDocPlugin();

// Build the Samples sidebar from the same catalog that drives the example gallery + page generator,
// grouped by category in catalog order (labels and titles come straight from the catalog).
const catalog = JSON.parse(
  readFileSync(new URL('../example/samples.catalog.json', import.meta.url), 'utf8')
);
const sampleGroups = [];
for (const { slug, title, category } of catalog) {
  let group = sampleGroups.find((g) => g.label === category);
  if (!group) {
    // Collapsed: Starlight keeps the current page's group open.
    group = { label: category, items: [], collapsed: true };
    sampleGroups.push(group);
  }
  group.items.push({ label: title, slug: `samples/${sampleName(slug)}` });
}

// Served via GitHub Pages at the root of the custom domain mapforge.dev: the site of both
// packages, expo-arcgis and expo-arcgis-toolkit.
export default defineConfig({
  site: 'https://mapforge.dev',
  integrations: [
    starlight({
      title: 'expo-arcgis',
      description:
        "The native ArcGIS Maps SDK for React Native and Expo: maps and scenes, layers, editing, geocoding, routing, offline and the ArcGIS Toolkit's components.",
      // Each page's title, description and social image for search engines and link previews.
      routeMiddleware: './src/routeData.ts',
      customCss: ['./src/styles/theme.css'],
      favicon: '/favicon.svg',
      components: {
        Header: './src/components/Header.astro',
      },
      head: [
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' } },
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
        // /llms.txt, /llms-full.txt and /llms-small.txt: the docs as text, for AI assistants and
        // AI search.
        starlightLlmsTxt({
          projectName: 'expo-arcgis',
          description:
            "expo-arcgis is the native ArcGIS Maps SDK (Kotlin on Android, Swift on iOS) for React Native and Expo, as Expo modules with a declarative API that mirrors the ArcGIS object model. expo-arcgis-toolkit adds the ArcGIS Maps SDK Toolkits' components.",
          details: [
            'Install with `npx expo install expo-arcgis` (and `expo-arcgis-toolkit` for the Toolkit), add the packages\' config plugins and run a development build: it does not run in Expo Go.',
            'A `<Map>` model goes inside a `<MapView>` host (`<Scene>` and `<SceneView>` in 3D), with layers and graphics as children; `<MapSettings>` sets the API key.',
            'Components the Toolkit has on one platform only render nothing on the other; the API reference marks them with Platform.',
          ].join('\n\n'),
          customSets: [
            {
              label: 'Guides',
              paths: ['guides/**'],
              description: 'Getting started, concepts, the Toolkit and the platform differences.',
            },
            {
              label: 'Samples',
              paths: ['samples/**'],
              description: 'Runnable example screens, one per capability, with their source.',
            },
            {
              label: 'expo-arcgis API',
              paths: ['api/**'],
              description: 'The API reference of the core package.',
            },
            {
              label: 'expo-arcgis-toolkit API',
              paths: ['api-toolkit/**'],
              description: 'The API reference of the Toolkit package.',
            },
          ],
          promote: ['guides/getting-started', 'guides/concepts', 'guides/toolkit'],
          // llms-small.txt keeps the guides, the samples and the API indexes: each symbol's page is
          // in the API sets.
          exclude: ['api/*/**', 'api-toolkit/*/**'],
          // The headings' anchor links would read "Section titled …" after every heading.
          customSelectors: { all: ['.sl-anchor-link'] },
          optionalLinks: [
            {
              label: 'GitHub',
              url: 'https://github.com/alex-krassavin/expo-arcgis',
              description: 'The source, issues and changelogs of both packages.',
            },
          ],
        }),
        // Generates the API Reference under src/content/docs/api/ from the core's typed source.
        starlightTypeDoc({
          entryPoints: ['../packages/expo-arcgis/src/index.ts'],
          tsconfig: '../packages/expo-arcgis/tsconfig.json',
          typeDoc: {
            skipErrorChecking: true,
            excludeInternal: true,
            blockTags,
            // Prepend the hand-authored 2×2 category cards (raw HTML) above the
            // auto-generated category lists on the API index. mergeReadme is required
            // for the project-root page; path is relative to docs/ (TypeDoc's cwd).
            readme: './src/content/docs/_api-intro.md',
            mergeReadme: true,
          },
        }),
        // And expo-arcgis-toolkit's, under src/content/docs/api-toolkit/.
        toolkitTypeDoc({
          entryPoints: ['../packages/expo-arcgis-toolkit/src/index.ts'],
          tsconfig: '../packages/expo-arcgis-toolkit/tsconfig.json',
          output: 'api-toolkit',
          sidebar: { label: 'Toolkit API' },
          typeDoc: {
            skipErrorChecking: true,
            excludeInternal: true,
            blockTags,
          },
        }),
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting started', slug: 'guides/getting-started' },
            { label: 'Concepts', slug: 'guides/concepts' },
            { label: 'Toolkit', slug: 'guides/toolkit' },
            { label: 'Platform differences', slug: 'guides/platform-differences' },
          ],
        },
        { label: 'Samples', items: sampleGroups },
        typeDocSidebarGroup,
        toolkitTypeDocSidebarGroup,
      ],
    }),
  ],
  // Allow importing example sample sources (outside docs/) as raw text for code blocks.
  vite: {
    server: { fs: { allow: ['..'] } },
  },
});
