import { requireNativeView } from 'expo';
import { useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';

import type { SceneViewProps } from './ExpoArcgis.types';
import type { SceneRef, GraphicsOverlayRef } from './ExpoArcgisModule';
import { GeoViewContext, useGeoModel, type GraphicsOverlayHost } from './contexts';

type NativeSceneViewProps = SceneViewProps & {
  /** The native scene handle (SharedObject), passed by reference as a view prop. */
  scene: SceneRef;
  /** Graphics overlays declared as `<GraphicsOverlay>` children, passed by reference. */
  graphicsOverlays: GraphicsOverlayRef[];
  children?: ReactNode;
};

const NativeSceneView = requireNativeView<NativeSceneViewProps>('ExpoArcgis', 'ExpoArcgisSceneView');

/**
 * Declarative 3D scene view. Renders the `Scene` from the nearest `<Scene>` and hosts the
 * `<GraphicsOverlay>` children declared inside it.
 */
export function SceneView({ children, ...props }: PropsWithChildren<SceneViewProps>) {
  const scene = useGeoModel() as SceneRef;

  const [overlays, setOverlays] = useState<GraphicsOverlayRef[]>([]);
  const host = useMemo<GraphicsOverlayHost>(
    () => ({
      add: (overlay) => setOverlays((prev) => (prev.includes(overlay) ? prev : [...prev, overlay])),
      remove: (overlay) => setOverlays((prev) => prev.filter((o) => o !== overlay)),
    }),
    []
  );

  return (
    <NativeSceneView scene={scene} graphicsOverlays={overlays} {...props}>
      <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
    </NativeSceneView>
  );
}
