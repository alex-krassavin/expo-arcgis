import { requireNativeView } from 'expo';
import { useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';

import type { SceneViewProps } from './ExpoArcgis.types';
import type { SceneRef, GraphicsOverlayRef, AnalysisOverlayRef } from './ExpoArcgisModule';
import { GeoViewContext, useGeoModel, type GeoViewHost } from './contexts';

type NativeSceneViewProps = SceneViewProps & {
  /** The native scene handle (SharedObject), passed by reference as a view prop. */
  scene: SceneRef;
  /** Graphics overlays declared as `<GraphicsOverlay>` children, passed by reference. */
  graphicsOverlays: GraphicsOverlayRef[];
  /** Analysis overlays declared as `<AnalysisOverlay>` children, passed by reference. */
  analysisOverlays: AnalysisOverlayRef[];
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

  return (
    <NativeSceneView
      scene={scene}
      graphicsOverlays={overlays}
      analysisOverlays={analysisOverlays}
      {...props}
    >
      <GeoViewContext.Provider value={host}>{children}</GeoViewContext.Provider>
    </NativeSceneView>
  );
}
