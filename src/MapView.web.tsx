import { type PropsWithChildren } from 'react';

import type { MapViewProps } from './ExpoArcgis.types';

// ArcGIS native map rendering is not available on the web platform.
export function MapView(_props: PropsWithChildren<MapViewProps>) {
  throw new Error('MapView is not available on the web platform.');
}
