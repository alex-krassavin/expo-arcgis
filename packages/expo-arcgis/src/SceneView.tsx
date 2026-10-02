import { requireNativeView } from 'expo';
import type { SharedObject } from 'expo-modules-core';
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
import ExtrasModule from './ExpoArcgisExtrasModule';
import type {
  SceneRef,
  GeoViewRef,
  GraphicsOverlayRef,
  AnalysisOverlayRef,
} from './ExpoArcgisModule';
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
  /** UI other packages draw over the scene (expo-arcgis-toolkit's compass…), passed by reference. */
  accessories: InstanceType<SharedObject>[];
  /** The view for the views of other packages that bind to it (expo-arcgis-toolkit's panels). */
  geoView: GeoViewRef;
  /** Ref to the native view, whose `retryLoad` async function is callable through it. */
  ref?: Ref<unknown>;
  children?: ReactNode;
};

const NativeSceneView = requireNativeView<NativeSceneViewProps>('ExpoArcgis', 'ExpoArcgisSceneView');

/**
 * Declarative 3D scene view. Renders the `Scene` from the nearest `<Scene>`, hosts the
 * `<GraphicsOverlay>` / `<AnalysisOverlay>` children, and exposes `retryLoad` via a `ref`. Other
 * React children, such as buttons, render above the scene where their layout puts them.
 */
export const SceneView = forwardRef<SceneViewHandle, PropsWithChildren<SceneViewProps>>(
  function SceneView({ children, orbitGraphic, ...props }, handle) {
    const scene = useGeoModelFor('SceneView') as SceneRef;
    // The native view exposes an async `retryLoad` function callable through its ref.
    const nativeRef = useRef<any>(null);

    const [overlays, setOverlays] = useState<GraphicsOverlayRef[]>([]);
    const [analysisOverlays, setAnalysisOverlays] = useState<AnalysisOverlayRef[]>([]);
    const [accessories, setAccessories] = useState<InstanceType<SharedObject>[]>([]);
    // The view for packages built on expo-arcgis whose own views bind to it (`useGeoViewRef`).
    const geoView = useMemo(() => new ExtrasModule.GeoViewRef(), []);
    const host = useMemo<GeoViewHost>(
      () => ({
        geoView,
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
        addAccessory: (accessory) =>
          setAccessories((prev) => (prev.includes(accessory) ? prev : [...prev, accessory])),
        removeAccessory: (accessory) =>
          setAccessories((prev) => prev.filter((a) => a !== accessory)),
      }),
      [geoView]
    );

    // The native view exposes `retryLoad` on its ref, so hand that ref over, with the view's
    // GeoViewRef. (It's attached before this layout-phase handle runs, so reading it here is safe.)
    useImperativeHandle(
      handle,
      () => Object.assign(nativeRef.current, { geoView }) as SceneViewHandle,
      [geoView]
    );

    return (
      <NativeSceneView
        ref={nativeRef}
        scene={sharedObjectId(scene)}
        graphicsOverlays={overlays.map(sharedObjectId)}
        analysisOverlays={analysisOverlays.map(sharedObjectId)}
        accessories={accessories.map(sharedObjectId)}
        geoView={sharedObjectId(geoView)}
        orbitGraphic={sharedObjectId(orbitGraphic)}
        {...props}
        onSceneLoadError={props.onSceneLoadError ?? warnLoadError}
      >
        <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
      </NativeSceneView>
    );
  }
);
