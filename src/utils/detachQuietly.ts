/**
 * Runs a SharedObject *detach* call — e.g. `overlay.removeGraphic(g)`, `model.removeLayer(l)`,
 * `view.setGeometryEditor(null)` — that may race with React's unmount ordering.
 *
 * When a subtree unmounts, React releases a parent SharedObject (the `<Map>` / `<MapView>` /
 * `<GraphicsOverlay>` / `<AnalysisOverlay>` …) before its children's effect cleanups run. The child
 * then detaching itself from that already-released parent throws
 * `NativeSharedObjectNotFoundException` (the native receiver/argument can no longer be resolved).
 * That is benign at teardown — there is nothing left to detach from — so we swallow it. When only
 * the child unmounts (the parent stays mounted), the detach runs normally and removes the child.
 *
 * The child still releases its *own* SharedObject afterwards: that object is owned by the child and
 * is always alive at this point, so its `release()` is left unguarded.
 */
export function detachQuietly(detach: () => void): void {
  try {
    detach();
  } catch {
    // Parent SharedObject already released by its own unmount — nothing to detach from.
  }
}
