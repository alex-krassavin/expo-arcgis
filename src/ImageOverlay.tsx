import { useEffect, useRef } from 'react';

import type { ImageOverlayProps } from './ExpoArcgis.types';
import ExtrasModule from './ExpoArcgisExtrasModule';
import type { ImageOverlayRef } from './ExpoArcgisModule';
import { useGeoView } from './contexts';

/**
 * Declarative image overlay. Displays a single georeferenced image (a local file) at a map extent on
 * the nearest `<MapView>`. Update `imagePath` to swap the displayed frame — e.g. to animate a
 * sequence of georeferenced images. No-op inside a `<SceneView>`.
 */
export function ImageOverlay({ imagePath, extent, opacity }: ImageOverlayProps) {
  const view = useGeoView();
  const ref = useRef<ImageOverlayRef | undefined>(undefined);
  if (!ref.current) {
    ref.current = new ExtrasModule.ImageOverlayRef();
  }

  useEffect(() => {
    const overlay = ref.current!;
    view.addImageOverlay(overlay);
    return () => {
      view.removeImageOverlay(overlay);
      overlay.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply the frame whenever the image, extent, or opacity changes.
  useEffect(() => {
    ref.current?.setFrame(imagePath, extent, opacity);
  }, [imagePath, extent, opacity]);

  return null;
}
