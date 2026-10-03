// What search engines and link previews see of each page: its <title>, description and social
// image text. One place for both the <head> (src/routeData.ts) and the social images
// (src/pages/og/[...route].ts).
import catalog from '../../example/samples.catalog.json';
import { sampleName } from '../scripts/sample-name.mjs';

export const SITE_NAME = 'expo-arcgis';
const SUFFIX = ` · ${SITE_NAME}`;

export const HOME_TITLE = 'expo-arcgis — ArcGIS Maps SDK for React Native & Expo';
export const SITE_DESCRIPTION =
  "The native ArcGIS Maps SDK for React Native and Expo: maps and scenes, layers, editing, geocoding, routing, offline and the ArcGIS Toolkit's components.";

/** Each sample page's category, by page name. */
const sampleCategories = new Map(
  catalog.map(({ slug, category }: { slug: string; category: string }) => [
    sampleName(slug),
    category,
  ])
);

export interface PageSeo {
  /** The page's <title>. */
  title: string;
  /** og:title and the social image's heading: the title without the site's name. */
  heading: string;
  /** What the page is, on the social image: "Guide", "Toolkit sample", "expo-arcgis API"… */
  kind: string;
  /** The meta description. */
  description: string;
}

interface PageData {
  title: string;
  description?: string;
  seoTitle?: string;
}

/** The SEO of the docs page `id` (a content collection entry id, `index` for the home page). */
export function pageSeo(id: string, data: PageData, body?: string): PageSeo {
  if (id === 'index') {
    return {
      title: data.seoTitle ?? HOME_TITLE,
      heading: 'ArcGIS Maps SDK for React Native & Expo',
      kind: 'Docs & samples',
      description: data.description ?? SITE_DESCRIPTION,
    };
  }
  const [section, ...rest] = id.split('/');
  const name = rest.join('/');
  if (section === 'samples') {
    const category = sampleCategories.get(name);
    const kind = category ? `${category} sample` : 'Sample';
    return {
      title: `${data.title} — ${kind}${SUFFIX}`,
      heading: data.title,
      kind,
      description: data.description ?? SITE_DESCRIPTION,
    };
  }
  if (section === 'api' || section === 'api-toolkit') {
    const pkg = section === 'api' ? 'expo-arcgis' : 'expo-arcgis-toolkit';
    if (name === 'readme') {
      return {
        title: `${pkg} API reference`,
        heading: `${pkg} API reference`,
        kind: 'API reference',
        description:
          section === 'api'
            ? 'Every component, hook, function and type of expo-arcgis, the native ArcGIS Maps SDK for React Native and Expo.'
            : "Every component and type of expo-arcgis-toolkit: the ArcGIS Toolkit's components for React Native and Expo.",
      };
    }
    return {
      title: `${data.title} — ${pkg} API`,
      heading: data.title,
      kind: `${pkg} API`,
      description:
        apiSummary(body) ?? `${data.title} in the ${pkg} API reference: its signature, docs and source.`,
    };
  }
  const title = data.seoTitle ?? `${data.title}${SUFFIX}`;
  return {
    title,
    heading: title.endsWith(SUFFIX) ? title.slice(0, -SUFFIX.length) : title,
    kind: section === 'guides' ? 'Guide' : '',
    description: data.description ?? SITE_DESCRIPTION,
  };
}

/** The path of a page's social image. */
export function ogImagePath(id: string): string {
  return `/og/${id}.jpeg`;
}

/** Shortens a description for a meta tag or an image, at a word, to `max` characters. */
export function clip(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '')}…`;
}

/**
 * The first paragraph of prose in an API page's Markdown (TypeDoc's): after its signature and its
 * "Defined in" line, outside code blocks, as plain text.
 */
function apiSummary(body: string | undefined): string | undefined {
  if (!body) return undefined;
  let inCode = false;
  for (const block of body.split(/\n\s*\n/)) {
    const text = block.trim();
    const fences = (text.match(/^```/gm) ?? []).length;
    if (inCode || text.startsWith('```')) {
      if (fences % 2 === 1) inCode = !inCode;
      continue;
    }
    if (!text || /^(>|#|Defined in:|\||[-*] |\d+\. |<|:::|\*\*\*)/.test(text)) continue;
    return clip(
      text
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\*\*([^*]*)\*\*/g, '$1')
        .replace(/\\([\\`*_{}[\]()#+\-.!|<>])/g, '$1')
        .replace(/\s+/g, ' ')
    );
  }
  return undefined;
}
