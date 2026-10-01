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

/**
 * How a misplaced component is named in the error. The library's own components pass their name
 * (`useGeoModelFor('FeatureLayer')`), so the message says which one it is; the public hooks keep
 * their signatures and fall back to "This component".
 */
function describe(component: string | undefined) {
  return component ? `<${component}>` : 'This component';
}

export function useGeoModel(): GeoModelRef {
  return useGeoModelFor();
}

/** `useGeoModel` that names the calling component if it is used outside a `<Map>` / `<Scene>`. */
export function useGeoModelFor(component?: string): GeoModelRef {
  const model = useContext(GeoModelContext);
  if (!model) {
    throw new Error(`[expo-arcgis] ${describe(component)} must be inside a <Map> or <Scene>.`);
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
  return useGeoViewFor();
}

/** `useGeoView` that names the calling component if it is used outside a `<MapView>` / `<SceneView>`. */
export function useGeoViewFor(component?: string): GeoViewHost {
  const host = useContext(GeoViewContext);
  const model = useContext(GeoModelContext);
  if (!host) {
    // The usual slip: declared next to the view inside <Map> / <Scene>, which is where layers go.
    // Overlays and editors are properties of the view, so they have to be its children.
    throw new Error(
      model
        ? `[expo-arcgis] ${describe(component)} is inside <Map>/<Scene> but not inside the view. ` +
            'Overlays and editors belong to the view: move it between <MapView> and </MapView> ' +
            '(or <SceneView> and </SceneView>).'
        : `[expo-arcgis] ${describe(component)} must be inside a <MapView> or <SceneView>.`
    );
  }
  return host;
}

/** The nearest `<GraphicsOverlay>`. Graphics attach here. */
export const GraphicsOverlayContext = createContext<GraphicsOverlayRef | undefined>(undefined);

export function useGraphicsOverlay(): GraphicsOverlayRef {
  return useGraphicsOverlayFor();
}

/** `useGraphicsOverlay` that names the calling component if it is used outside a `<GraphicsOverlay>`. */
export function useGraphicsOverlayFor(component?: string): GraphicsOverlayRef {
  const overlay = useContext(GraphicsOverlayContext);
  if (!overlay) {
    throw new Error(`[expo-arcgis] ${describe(component)} must be inside a <GraphicsOverlay>.`);
  }
  return overlay;
}

/** The nearest `<AnalysisOverlay>`. Visual analyses (`<Viewshed>` / `<LineOfSight>`) attach here. */
export const AnalysisOverlayContext = createContext<AnalysisOverlayRef | undefined>(undefined);

export function useAnalysisOverlay(component: string): AnalysisOverlayRef {
  const overlay = useContext(AnalysisOverlayContext);
  if (!overlay) {
    throw new Error(`[expo-arcgis] <${component}> must be inside an <AnalysisOverlay>.`);
  }
  return overlay;
}
