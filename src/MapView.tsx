import { requireNativeView } from 'expo';
import { useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';

import type { MapViewProps } from './ExpoArcgis.types';
import type { MapRef, GraphicsOverlayRef, GeometryEditorRef } from './ExpoArcgisModule';
import { GeoViewContext, useGeoModel, type GeoViewHost } from './contexts';

type NativeMapViewProps = MapViewProps & {
  /** The native map handle (SharedObject), passed by reference as a view prop. */
  map: MapRef;
  /** Graphics overlays declared as `<GraphicsOverlay>` children, passed by reference. */
  graphicsOverlays: GraphicsOverlayRef[];
  /** Interactive geometry editor declared as a `<GeometryEditor>` child, passed by reference. */
  geometryEditor?: GeometryEditorRef | null;
  children?: ReactNode;
};

const NativeMapView = requireNativeView<NativeMapViewProps>('ExpoArcgis');

/**
 * Declarative 2D map view. Renders the `ArcGISMap` from the nearest `<Map>` and hosts the
 * `<GraphicsOverlay>` children declared inside it.
 */
export function MapView({ children, ...props }: PropsWithChildren<MapViewProps>) {
  const map = useGeoModel() as MapRef;

  const [overlays, setOverlays] = useState<GraphicsOverlayRef[]>([]);
  const [geometryEditor, setGeometryEditor] = useState<GeometryEditorRef | null>(null);
  const host = useMemo<GeoViewHost>(
    () => ({
      add: (overlay) => setOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
      remove: (overlay) => setOverlays((prev) => prev.filter((o) => o !== overlay)),
      setGeometryEditor: (editor) => setGeometryEditor(editor),
    }),
    []
  );

  return (
    <NativeMapView map={map} graphicsOverlays={overlays} geometryEditor={geometryEditor} {...props}>
      <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
    </NativeMapView>
  );
}
