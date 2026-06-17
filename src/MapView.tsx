import { requireNativeView } from 'expo';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
} from 'react';

import type { MapViewHandle, MapViewProps } from './ExpoArcgis.types';
import type {
  MapRef,
  GraphicsOverlayRef,
  GeometryEditorRef,
  ImageOverlayRef,
} from './ExpoArcgisModule';
import { GeoViewContext, useGeoModel, type GeoViewHost } from './contexts';
import { sharedObjectId } from './utils/sharedObjectId';

type NativeMapViewProps = MapViewProps & {
  /** The native map handle (SharedObject), passed by reference as a view prop. */
  map: MapRef;
  /** Graphics overlays declared as `<GraphicsOverlay>` children, passed by reference. */
  graphicsOverlays: GraphicsOverlayRef[];
  /** Image overlays declared as `<ImageOverlay>` children, passed by reference. */
  imageOverlays: ImageOverlayRef[];
  /** Interactive geometry editor declared as a `<GeometryEditor>` child, passed by reference. */
  geometryEditor?: GeometryEditorRef | null;
  /** Ref to the native view, whose `identify` async function is callable through it. */
  ref?: Ref<unknown>;
  children?: ReactNode;
};

const NativeMapView = requireNativeView<NativeMapViewProps>('ExpoArcgis');

/**
 * Declarative 2D map view. Renders the `ArcGISMap` from the nearest `<Map>`, hosts the
 * `<GraphicsOverlay>` / `<GeometryEditor>` children, and exposes `identify` via a `ref`.
 */
export const MapView = forwardRef<MapViewHandle, PropsWithChildren<MapViewProps>>(
  function MapView({ children, ...props }, handle) {
    const map = useGeoModel() as MapRef;
    // The native view exposes an async `identify` function callable through its ref.
    const nativeRef = useRef<any>(null);

    const [overlays, setOverlays] = useState<GraphicsOverlayRef[]>([]);
    const [imageOverlays, setImageOverlays] = useState<ImageOverlayRef[]>([]);
    const [geometryEditor, setGeometryEditor] = useState<GeometryEditorRef | null>(null);
    const host = useMemo<GeoViewHost>(
      () => ({
        add: (overlay) => setOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
        remove: (overlay) => setOverlays((prev) => prev.filter((o) => o !== overlay)),
        addImageOverlay: (overlay) =>
          setImageOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
        removeImageOverlay: (overlay) =>
          setImageOverlays((prev) => prev.filter((o) => o !== overlay)),
        setGeometryEditor: (editor) => setGeometryEditor(editor),
        // Visual analyses (viewshed / line-of-sight) are 3D only — no-op on a 2D map.
        addAnalysisOverlay: () => {},
        removeAnalysisOverlay: () => {},
      }),
      []
    );

    // The native view exposes `identify` on its ref, so hand that ref over directly. (It's
    // attached before this layout-phase handle runs, so reading it here is safe.)
    useImperativeHandle(handle, () => nativeRef.current as MapViewHandle, []);

    return (
      <NativeMapView
        ref={nativeRef}
        // SharedObjects are passed by registry id so they survive the Fabric prop pipeline on
        // expo-modules-core < 56.0.13 (which lacks the auto-unwrap from expo/expo#46212).
        map={sharedObjectId(map)}
        graphicsOverlays={overlays.map(sharedObjectId)}
        imageOverlays={imageOverlays.map(sharedObjectId)}
        geometryEditor={sharedObjectId(geometryEditor)}
        {...props}
      >
        <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
      </NativeMapView>
    );
  }
);
