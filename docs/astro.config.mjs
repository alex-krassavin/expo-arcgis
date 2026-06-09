// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

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
          items: [{ label: 'Getting started', slug: 'guides/getting-started' }],
        },
        {
          label: 'Samples',
          items: [{ autogenerate: { directory: 'samples' } }],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
  // Allow importing example sample sources (outside docs/) as raw text for code blocks.
  vite: {
    server: { fs: { allow: ['..'] } },
  },
});
