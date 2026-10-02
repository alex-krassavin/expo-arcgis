import { requireNativeView } from 'expo';
import { useGeoModel } from 'expo-arcgis';
import type { ViewProps } from 'react-native';

import { registryId } from './registryId';

export type BasemapGalleryProps = ViewProps;

type NativeBasemapGalleryProps = ViewProps & {
  /** The nearest `<Map>`'s native object, by registry id (see expo-arcgis's `sharedObjectId`). */
  geoModel: unknown;
};

const NativeBasemapGallery = requireNativeView<NativeBasemapGalleryProps>(
  'ExpoArcgisToolkit',
  'BasemapGalleryView'
);

/**
 * The ArcGIS Toolkit's basemap gallery: ArcGIS Online's developer basemaps. Picking one makes it the
 * basemap of the nearest `<Map>`. A panel: lay it out anywhere inside the `<Map>`, next to the
 * `<MapView>` or in a sheet.
 *
 * ```tsx
 * <Map basemap="arcGISTopographic">
 *   <MapView style={{ flex: 1 }} />
 *   <BasemapGallery style={{ height: 240 }} />
 * </Map>
 * ```
 */
export function BasemapGallery(props: BasemapGalleryProps) {
  const geoModel = useGeoModel();
  return <NativeBasemapGallery {...props} geoModel={registryId(geoModel)} />;
}
