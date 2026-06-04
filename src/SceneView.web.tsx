import { type PropsWithChildren } from 'react';

import type { SceneViewProps } from './ExpoArcgis.types';

// ArcGIS native scene rendering is not available on the web platform.
export function SceneView(_props: PropsWithChildren<SceneViewProps>) {
  throw new Error('SceneView is not available on the web platform.');
}
