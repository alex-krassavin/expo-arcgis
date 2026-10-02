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

import type { LocalSceneViewHandle, LocalSceneViewProps } from './ExpoArcgis.types';
import ExtrasModule from './ExpoArcgisExtrasModule';
import type { GeoViewRef, SceneRef } from './ExpoArcgisModule';
import { GeoViewContext, useGeoModelFor, type GeoViewHost } from './contexts';
import { sharedObjectId } from './utils/sharedObjectId';
import { unhandledLoadError } from './utils/unhandledLoadError';

const warnLoadError = unhandledLoadError('LocalSceneView', 'onSceneLoadError');

type NativeLocalSceneViewProps = LocalSceneViewProps & {
  /** The native scene handle (SharedObject), passed by reference as a view prop. */
  scene: SceneRef;
  /** UI other packages draw over the scene (expo-arcgis-toolkit), passed by reference. */
  accessories: InstanceType<SharedObject>[];
  /** The view for the views of other packages that bind to it (expo-arcgis-toolkit's panels). */
  geoView: GeoViewRef;
  /** Ref to the native view, whose async functions are callable through it. */
  ref?: Ref<unknown>;
  children?: ReactNode;
};

const NativeLocalSceneView = requireNativeView<NativeLocalSceneViewProps>(
  'ExpoArcgis',
  'ExpoArcgisLocalSceneView'
);

/**
 * Declarative local 3D scene view: the SDK's `LocalSceneView`, for a scene whose viewing mode is
 * local — a local web scene, or `<Scene viewingMode="local">`. Renders the scene from the nearest
 * `<Scene>`. Packages built on expo-arcgis draw over it and bind their panels to it, as with a
 * `<SceneView>` (expo-arcgis-toolkit's building explorer). Other React children, such as buttons,
 * render above the scene where their layout puts them.
 *
 * ```tsx
 * <Scene portalItem={{ itemId: '<local web scene>' }}>
 *   <LocalSceneView style={{ flex: 1 }} />
 * </Scene>
 * ```
 */
export const LocalSceneView = forwardRef<
  LocalSceneViewHandle,
  PropsWithChildren<LocalSceneViewProps>
>(function LocalSceneView({ children, ...props }, handle) {
  const scene = useGeoModelFor('LocalSceneView') as SceneRef;
  // The native view exposes its async functions (`retryLoad`…) on its ref.
  const nativeRef = useRef<any>(null);

  const [accessories, setAccessories] = useState<InstanceType<SharedObject>[]>([]);
  // The view for packages built on expo-arcgis whose own views bind to it (`useGeoViewRef`).
  const geoView = useMemo(() => new ExtrasModule.GeoViewRef(), []);
  const host = useMemo<GeoViewHost>(
    () => ({
      geoView,
      // The SDK's LocalSceneView (300.1) has no graphics, image or analysis overlays and no
      // geometry editor: those children do nothing here.
      add: () => {},
      remove: () => {},
      setGeometryEditor: () => {},
      addAnalysisOverlay: () => {},
      removeAnalysisOverlay: () => {},
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
    () => Object.assign(nativeRef.current, { geoView }) as LocalSceneViewHandle,
    [geoView]
  );

  return (
    <NativeLocalSceneView
      ref={nativeRef}
      scene={sharedObjectId(scene)}
      accessories={accessories.map(sharedObjectId)}
      geoView={sharedObjectId(geoView)}
      {...props}
      onSceneLoadError={props.onSceneLoadError ?? warnLoadError}
    >
      <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
    </NativeLocalSceneView>
  );
});
