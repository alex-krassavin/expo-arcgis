import catalog from '../samples.catalog.json';

/** One example screen. */
export type Sample = {
  title: string;
  category: string;
  /** expo-router route, e.g. `/basics/display-map`. */
  href: string;
  description: string;
};

/**
 * All example screens, sourced from `samples.catalog.json` — the single source of truth shared
 * with the docs site's sample-page generator.
 */
export const SAMPLES: Sample[] = catalog.map((entry) => ({
  title: entry.title,
  category: entry.category,
  href: `/${entry.slug}`,
  description: entry.description,
}));

/** Distinct categories, in catalog order. */
export const CATEGORIES = Array.from(new Set(SAMPLES.map((sample) => sample.category)));
