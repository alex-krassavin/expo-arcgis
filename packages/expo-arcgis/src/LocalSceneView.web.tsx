import { type PropsWithChildren } from 'react';

import type { LocalSceneViewProps } from './ExpoArcgis.types';

// ArcGIS native scene rendering is not available on the web platform.
export function LocalSceneView(_props: PropsWithChildren<LocalSceneViewProps>) {
  throw new Error('LocalSceneView is not available on the web platform.');
}
