// A social image for every docs page (og:image, at /og/<page id>.jpeg): the page's heading and what
// it is, on the site's background. Generated at build time with astro-og-canvas.
import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

import { clip, pageSeo } from '../../seo';

const entries = await getCollection('docs');

const WIDTH = 1200;
const PADDING = 72;

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
  getSlug: (id) => `${id}.jpeg`,
  getImageOptions: (_id, entry) => {
    const seo = pageSeo(entry.id, entry.data, entry.body);
    const kind = seo.kind ? `${seo.kind} — ` : '';
    return {
      title: seo.heading,
      // About three lines.
      description: kind + clip(seo.description, 180 - kind.length),
      bgImage: { path: './src/assets/og/background.png' },
      logo: { path: './src/assets/og/wordmark.png', size: [360] },
      padding: PADDING,
      font: {
        title: {
          families: ['Space Grotesk'],
          weight: 'SemiBold',
          size: titleSize(seo.heading),
          lineHeight: 1.1,
          color: [14, 26, 22],
        },
        description: {
          families: ['IBM Plex Sans'],
          weight: 'Normal',
          size: 30,
          lineHeight: 1.45,
          color: [76, 92, 85],
        },
      },
      fonts: [
        'https://api.fontsource.org/v1/fonts/space-grotesk/latin-600-normal.ttf',
        'https://api.fontsource.org/v1/fonts/ibm-plex-sans/latin-400-normal.ttf',
      ],
      format: 'JPEG',
      quality: 88,
    };
  },
});

/**
 * The heading's font size: 64px, or less for a long one-word name, such as an API type's, so that
 * the name fits on a line rather than breaking mid-word. A character is about 0.52em wide: 0.56
 * leaves a margin.
 */
function titleSize(heading: string): number {
  const longestWord = Math.max(...heading.split(/\s+/).map((word) => word.length));
  return Math.min(64, Math.floor((WIDTH - 2 * PADDING) / (longestWord * 0.56)));
}
