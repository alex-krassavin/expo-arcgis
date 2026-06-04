import { requireNativeView } from 'expo';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import type { MapViewProps } from './ExpoArcgis.types';
import ExpoArcgisModule, {
  type MapRef,
  type GraphicsOverlayRef,
} from './ExpoArcgisModule';
import { useMap } from './Map';

type NativeMapViewProps = MapViewProps & {
  /** The native map handle (SharedObject), passed by reference as a view prop. */
  map: MapRef;
  /** The default graphics overlay this view owns, passed by reference. */
  graphicsOverlay: GraphicsOverlayRef;
  children?: ReactNode;
};

const NativeMapView = requireNativeView<NativeMapViewProps>('ExpoArcgis');

const MapViewContext = createContext<GraphicsOverlayRef | undefined>(undefined);

/** Returns the graphics overlay of the nearest `<MapView>` (used by `<Graphic>`). */
export function useMapView(): GraphicsOverlayRef {
  const overlay = useContext(MapViewContext);
  if (!overlay) {
    throw new Error('useMapView must be used within a <MapView>.');
  }
  return overlay;
}

/**
 * Declarative 2D map view. Renders the `ArcGISMap` from the nearest `<Map>` and owns a default
 * graphics overlay that descendant `<Graphic>` components draw onto.
 */
export function MapView({ children, ...props }: PropsWithChildren<MapViewProps>) {
  const map = useMap();

  const overlayRef = useRef<GraphicsOverlayRef | undefined>(undefined);
  if (!overlayRef.current) {
    overlayRef.current = new ExpoArcgisModule.GraphicsOverlayRef();
  }

  useEffect(() => {
    const overlay = overlayRef.current;
    return () => overlay?.release();
  }, []);

  return (
    <NativeMapView map={map} graphicsOverlay={overlayRef.current} {...props}>
      <MapViewContext.Provider value={overlayRef.current}>{children}</MapViewContext.Provider>
    </NativeMapView>
  );
}
