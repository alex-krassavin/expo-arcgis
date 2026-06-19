import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { GeometryEditorHandle, GeometryEditorProps } from './ExpoArcgis.types';
import ExpoArcgisModule, { type GeometryEditorRef } from './ExpoArcgisModule';
import { useGeoView } from './contexts';
import { detachQuietly } from './utils/detachQuietly';

/**
 * Interactive geometry editor. Mirrors the native `GeometryEditor` — place it inside a
 * `<MapView>` to let the user sketch a `type` geometry. Reports edits via `onGeometryChange`
 * and exposes undo / redo / clear / stop through a `ref`.
 *
 * The native SDK binds the editor to 2D map views only, so `<GeometryEditor>` has no effect
 * inside a `<SceneView>`.
 */
export const GeometryEditor = forwardRef<GeometryEditorHandle, GeometryEditorProps>(
  function GeometryEditor({ type, active = true, tool, onGeometryChange }, handle) {
    const view = useGeoView();
    const ref = useRef<GeometryEditorRef | undefined>(undefined);
    if (!ref.current) {
      ref.current = new ExpoArcgisModule.GeometryEditorRef();
    }

    // Bind the editor to the nearest <MapView> for its lifetime.
    useEffect(() => {
      const editor = ref.current!;
      view.setGeometryEditor(editor);
      return () => {
        detachQuietly(() => view.setGeometryEditor(null));
        editor.release();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Forward geometry-change events to the callback.
    useEffect(() => {
      if (!onGeometryChange) return;
      const subscription = ref.current!.addListener('onGeometryChange', ({ geometry }) => {
        onGeometryChange(geometry ?? null);
      });
      return () => subscription.remove();
    }, [onGeometryChange]);

    // Start / restart / stop editing as `active`, `type`, or `tool` changes.
    useEffect(() => {
      const editor = ref.current!;
      if (active) {
        if (tool) editor.setTool(tool);
        editor.start(type);
      } else {
        editor.stop();
      }
    }, [active, type, tool]);

    useImperativeHandle(
      handle,
      () => ({
        undo: () => ref.current?.undo(),
        redo: () => ref.current?.redo(),
        clear: () => ref.current?.clearGeometry(),
        deleteSelectedElement: () => ref.current?.deleteSelectedElement(),
        stop: () => ref.current?.stop() ?? null,
      }),
      []
    );

    return null;
  }
);
