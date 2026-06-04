import { requireNativeView } from 'expo';
import { type PropsWithChildren, type ReactNode } from 'react';

import type { MapViewProps } from './ExpoArcgis.types';
import type { ArcGISMapRef } from './ExpoArcgisModule';
import { useMap } from './Map';

type NativeMapViewProps = MapViewProps & {
  /** The native map handle is passed by reference (SharedObject) as a view prop. */
  map: ArcGISMapRef;
  children?: ReactNode;
};

const NativeMapView = requireNativeView<NativeMapViewProps>('ExpoArcgis');

/**
 * Declarative 2D map view. Renders the `ArcGISMap` provided by the nearest `<Map>` ancestor.
 */
export function MapView({ children, ...props }: PropsWithChildren<MapViewProps>) {
  const map = useMap();
  return (
    <NativeMapView map={map} {...props}>
      {children}
    </NativeMapView>
  );
}
