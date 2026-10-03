// Each page's <head> for search engines and link previews: its title, description, social image
// and, on the home page, structured data. Starlight's route middleware (astro.config.mjs).
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { HeadConfig } from '@astrojs/starlight/types';

import { clip, ogImagePath, pageSeo, SITE_DESCRIPTION, SITE_NAME } from './seo';

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const { entry, head } = route;
  // The docs collection's id: Starlight's route data has the home page's as '', not 'index'.
  const id = entry.id || 'index';
  const seo = pageSeo(id, entry.data, entry.body);
  const description = clip(seo.description);

  setTitle(head, seo.title);
  setMeta(head, 'name', 'description', description);
  setMeta(head, 'property', 'og:title', seo.heading);
  setMeta(head, 'property', 'og:description', description);
  if (id === 'index') setMeta(head, 'property', 'og:type', 'website');

  // Starlight's 404 page isn't in the docs collection, so it has no social image.
  if (id !== '404' && context.site) {
    const image = new URL(ogImagePath(id), context.site).href;
    setMeta(head, 'property', 'og:image', image);
    setMeta(head, 'property', 'og:image:width', '1200');
    setMeta(head, 'property', 'og:image:height', '630');
    setMeta(head, 'property', 'og:image:alt', seo.heading);
    setMeta(head, 'name', 'twitter:image', image);
  }

  if (id === 'index' && context.site) {
    head.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      content: JSON.stringify(homeStructuredData(context.site.href)),
    });
  }
});

function setTitle(head: HeadConfig, title: string) {
  const entry = head.find(({ tag }) => tag === 'title');
  if (entry) entry.content = title;
  else head.push({ tag: 'title', content: title });
}

/** Sets a `<meta>` tag's content, by its `name` or `property`, adding it if it isn't there. */
function setMeta(head: HeadConfig, key: 'name' | 'property', value: string, content: string) {
  const entry = head.find(({ tag, attrs }) => tag === 'meta' && attrs?.[key] === value);
  if (entry) entry.attrs = { ...entry.attrs, content };
  else head.push({ tag: 'meta', attrs: { [key]: value, content } });
}

/** The site and its two packages, for search engines (schema.org). */
function homeStructuredData(site: string) {
  const repository = 'https://github.com/alex-krassavin/expo-arcgis';
  const author = { '@type': 'Person', name: 'Alexandr Krassavin', url: 'https://github.com/alex-krassavin' };
  const packageData = (name: string, description: string, directory: string) => ({
    '@type': 'SoftwareSourceCode',
    name,
    description,
    url: site,
    codeRepository: `${repository}/tree/main/packages/${directory}`,
    programmingLanguage: ['TypeScript', 'Swift', 'Kotlin'],
    runtimePlatform: ['React Native', 'Expo', 'iOS', 'Android'],
    license: 'https://opensource.org/licenses/MIT',
    author,
    sameAs: `https://www.npmjs.com/package/${name}`,
  });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: site,
        description: SITE_DESCRIPTION,
      },
      packageData(
        'expo-arcgis',
        'The native ArcGIS Maps SDK for React Native, as Expo modules: maps and scenes, layers, graphics, geometry, editing, query, geocoding, routing, analysis, offline, real-time and authentication.',
        'expo-arcgis'
      ),
      packageData(
        'expo-arcgis-toolkit',
        "The ArcGIS Maps SDK Toolkits' components for expo-arcgis: compass, scalebar, search, bookmarks, popups, feature forms, offline map areas, sign-in, augmented reality and more.",
        'expo-arcgis-toolkit'
      ),
    ],
  };
}
