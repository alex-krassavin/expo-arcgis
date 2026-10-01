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
import { GeoViewContext, useGeoModelFor, type GeoViewHost } from './contexts';
import { sharedObjectId } from './utils/sharedObjectId';
import { unhandledLoadError } from './utils/unhandledLoadError';

const warnLoadError = unhandledLoadError('SceneView', 'onSceneLoadError');

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
  function SceneView({ children, orbitGraphic, ...props }, handle) {
    const scene = useGeoModelFor('SceneView') as SceneRef;
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
        // Image overlays are bound to <MapView> (2D) only.
        addImageOverlay: () => {},
        removeImageOverlay: () => {},
        // Accessories (expo-arcgis-toolkit's compass, scalebar…) draw over a <MapView> only, so far.
        addAccessory: () => {
          if (__DEV__) {
            console.warn(
              '[expo-arcgis] <SceneView> does not show accessories yet (a compass, a scalebar…): ' +
                'they draw over a <MapView> only.'
            );
          }
        },
        removeAccessory: () => {},
      }),
      []
    );

    // The native view exposes `retryLoad` on its ref, so hand that ref over directly.
    useImperativeHandle(handle, () => nativeRef.current as SceneViewHandle, []);

    return (
      <NativeSceneView
        ref={nativeRef}
        scene={sharedObjectId(scene)}
        graphicsOverlays={overlays.map(sharedObjectId)}
        analysisOverlays={analysisOverlays.map(sharedObjectId)}
        orbitGraphic={sharedObjectId(orbitGraphic)}
        {...props}
        onSceneLoadError={props.onSceneLoadError ?? warnLoadError}
      >
        <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
      </NativeSceneView>
    );
  }
);
