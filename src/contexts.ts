import { createContext, useContext } from 'react';

import type {
  AnalysisOverlayRef,
  GeoModelRef,
  GeometryEditorRef,
  GraphicsOverlayRef,
  ImageOverlayRef,
} from './ExpoArcgisModule';

/**
 * The nearest geo model — a `<Map>` or `<Scene>`. Operational layers attach here.
 * Both `Map` and `Scene` provide this context, so React's nearest-provider rule picks the
 * right parent automatically (a layer inside a `<Scene>` gets the scene, etc.).
 */
export const GeoModelContext = createContext<GeoModelRef | undefined>(undefined);

export function useGeoModel(): GeoModelRef {
  const model = useContext(GeoModelContext);
  if (!model) {
    throw new Error('This component must be used within a <Map> or <Scene>.');
  }
  return model;
}

/** Lets a `<GraphicsOverlay>` register itself with the nearest `<MapView>` / `<SceneView>`. */
export type GraphicsOverlayHost = {
  add(overlay: GraphicsOverlayRef): void;
  remove(overlay: GraphicsOverlayRef): void;
};

/** Lets a `<GeometryEditor>` bind itself to the nearest `<MapView>` (no-op on `<SceneView>`). */
export type GeometryEditorHost = {
  setGeometryEditor(editor: GeometryEditorRef | null): void;
};

/** Lets an `<AnalysisOverlay>` register itself with the nearest `<SceneView>` (no-op on `<MapView>`). */
export type AnalysisOverlayHost = {
  addAnalysisOverlay(overlay: AnalysisOverlayRef): void;
  removeAnalysisOverlay(overlay: AnalysisOverlayRef): void;
};

/** Lets an `<ImageOverlay>` register itself with the nearest `<MapView>` (no-op on `<SceneView>`). */
export type ImageOverlayHost = {
  addImageOverlay(overlay: ImageOverlayRef): void;
  removeImageOverlay(overlay: ImageOverlayRef): void;
};

/** What a `<MapView>` / `<SceneView>` exposes to its children. */
export type GeoViewHost = GraphicsOverlayHost &
  GeometryEditorHost &
  AnalysisOverlayHost &
  ImageOverlayHost;

/** The nearest geo view — a `<MapView>` or `<SceneView>`. Overlays / editors attach here. */
export const GeoViewContext = createContext<GeoViewHost | undefined>(undefined);

export function useGeoView(): GeoViewHost {
  const host = useContext(GeoViewContext);
  if (!host) {
    throw new Error('<GraphicsOverlay> / <GeometryEditor> must be used within a <MapView> or <SceneView>.');
  }
  return host;
}

/** The nearest `<GraphicsOverlay>`. Graphics attach here. */
export const GraphicsOverlayContext = createContext<GraphicsOverlayRef | undefined>(undefined);

export function useGraphicsOverlay(): GraphicsOverlayRef {
  const overlay = useContext(GraphicsOverlayContext);
  if (!overlay) {
    throw new Error('<Graphic> must be used within a <GraphicsOverlay>.');
  }
  return overlay;
}

/** The nearest `<AnalysisOverlay>`. Visual analyses (`<Viewshed>` / `<LineOfSight>`) attach here. */
export const AnalysisOverlayContext = createContext<AnalysisOverlayRef | undefined>(undefined);

export function useAnalysisOverlay(): AnalysisOverlayRef {
  const overlay = useContext(AnalysisOverlayContext);
  if (!overlay) {
    throw new Error('<Viewshed> / <LineOfSight> must be used within an <AnalysisOverlay>.');
  }
  return overlay;
}
