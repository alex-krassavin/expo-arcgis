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

import type { SceneViewHandle, SceneViewProps } from './ExpoArcgis.types';
import type { SceneRef, GraphicsOverlayRef, AnalysisOverlayRef } from './ExpoArcgisModule';
import { GeoViewContext, useGeoModel, type GeoViewHost } from './contexts';

type NativeSceneViewProps = SceneViewProps & {
  /** The native scene handle (SharedObject), passed by reference as a view prop. */
  scene: SceneRef;
  /** Graphics overlays declared as `<GraphicsOverlay>` children, passed by reference. */
  graphicsOverlays: GraphicsOverlayRef[];
  /** Analysis overlays declared as `<AnalysisOverlay>` children, passed by reference. */
  analysisOverlays: AnalysisOverlayRef[];
  /** Ref to the native view, whose `retryLoad` async function is callable through it. */
  ref?: Ref<unknown>;
  children?: ReactNode;
};

const NativeSceneView = requireNativeView<NativeSceneViewProps>('ExpoArcgis', 'ExpoArcgisSceneView');

/**
 * Declarative 3D scene view. Renders the `Scene` from the nearest `<Scene>`, hosts the
 * `<GraphicsOverlay>` / `<AnalysisOverlay>` children, and exposes `retryLoad` via a `ref`.
 */
export const SceneView = forwardRef<SceneViewHandle, PropsWithChildren<SceneViewProps>>(
  function SceneView({ children, ...props }, handle) {
    const scene = useGeoModel() as SceneRef;
    // The native view exposes an async `retryLoad` function callable through its ref.
    const nativeRef = useRef<any>(null);

    const [overlays, setOverlays] = useState<GraphicsOverlayRef[]>([]);
    const [analysisOverlays, setAnalysisOverlays] = useState<AnalysisOverlayRef[]>([]);
    const host = useMemo<GeoViewHost>(
      () => ({
        add: (overlay) => setOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
        remove: (overlay) => setOverlays((prev) => prev.filter((o) => o !== overlay)),
        // The SDK binds a GeometryEditor to MapView only; 3D scene editing is not supported.
        setGeometryEditor: () => {},
        addAnalysisOverlay: (overlay) =>
          setAnalysisOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
        removeAnalysisOverlay: (overlay) =>
          setAnalysisOverlays((prev) => prev.filter((o) => o !== overlay)),
      }),
      []
    );

    // The native view exposes `retryLoad` on its ref, so hand that ref over directly.
    useImperativeHandle(handle, () => nativeRef.current as SceneViewHandle, []);

    return (
      <NativeSceneView
        ref={nativeRef}
        scene={scene}
        graphicsOverlays={overlays}
        analysisOverlays={analysisOverlays}
        {...props}
      >
        <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
      </NativeSceneView>
    );
  }
);
