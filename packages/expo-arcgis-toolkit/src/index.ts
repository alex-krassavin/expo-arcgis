import { requireNativeView } from 'expo';
import type { MapRef } from 'expo-arcgis';
import type { ViewProps } from 'react-native';

// SPIKE — the toolkit package's build-compatibility probe. It compiles the ArcGIS Toolkit's
// components against the expo-arcgis core on each Expo SDK and is replaced by the real components
// (Compass, Scalebar, BasemapGallery…) once the core's extension points are agreed.

/** @internal Build probe, not public API. */
export type ToolkitProbeProps = ViewProps & {
  /** A `<Map>`'s ref: checks that the toolkit can resolve the core's shared objects natively. */
  map?: MapRef;
};

/** @internal Build probe, not public API. */
export const ToolkitProbe = requireNativeView<ToolkitProbeProps>('ExpoArcgisToolkit');
