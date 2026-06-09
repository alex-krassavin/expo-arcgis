/** Registry of example screens — drives the home gallery and (later) the docs pages. */
export type Sample = {
  /** Display title. */
  title: string;
  /** Group heading on the home screen. */
  category: string;
  /** expo-router route, e.g. `/basics/display-map`. */
  href: string;
  /** One-line description. */
  description: string;
};

export const SAMPLES: Sample[] = [
  {
    title: 'Display a map',
    category: 'Basics',
    href: '/basics/display-map',
    description: 'A basemap and an initial viewpoint.',
  },
  {
    title: 'Feature layer',
    category: 'Layers',
    href: '/layers/feature-layer',
    description: 'Add a feature service layer to the map.',
  },
  {
    title: 'Display a scene (3D)',
    category: '3D',
    href: '/three-d/scene',
    description: 'A 3D scene with terrain and a camera.',
  },
];

/** Distinct categories, in first-seen order. */
export const CATEGORIES = Array.from(new Set(SAMPLES.map((sample) => sample.category)));
