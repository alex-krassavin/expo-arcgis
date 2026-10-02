import { requireNativeView } from 'expo';
import {
  useGeoViewRef,
  type MapViewHandle,
  type SceneViewHandle,
  type Viewpoint,
} from 'expo-arcgis';
import type { RefObject } from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

import { availableOn } from './availableOn';
import { registryId } from './registryId';

/** A bookmark: a name and the viewpoint it goes to. */
export type Bookmark = {
  name: string;
  viewpoint?: Viewpoint;
};

export type BookmarksProps = ViewProps & {
  /** The bookmarks to list. @default the bookmarks of the view's map or scene */
  bookmarks?: Bookmark[];
  /**
   * The view the bookmarks belong to, which moves to the one picked: a `<MapView>` or `<SceneView>`
   * ref. @default the view the bookmarks are placed in
   */
  geoView?: RefObject<MapViewHandle | SceneViewHandle | null>;
  /** Called with the bookmark picked. */
  onSelectionChange?: (bookmark: Bookmark) => void;
  /** Called with `false` when the bookmarks ask to be hidden: after a pick, or on Done. */
  onIsPresentedChange?: (isPresented: boolean) => void;
};

type NativeBookmarksProps = Omit<BookmarksProps, 'geoView' | 'onSelectionChange' | 'onIsPresentedChange'> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
  onSelectionChange?: (event: NativeSyntheticEvent<{ bookmark: Bookmark }>) => void;
  onIsPresentedChange?: (event: NativeSyntheticEvent<{ isPresented: boolean }>) => void;
};

// The Kotlin Toolkit has no bookmarks: the native view exists on iOS only.
const NativeBookmarks =
  Platform.OS === 'ios'
    ? requireNativeView<NativeBookmarksProps>('ExpoArcgisToolkit', 'BookmarksView')
    : null;

/**
 * The ArcGIS Toolkit's bookmarks: the bookmarks of a view's map or scene (a web map's, say), or the
 * ones given. Picking one moves the view to it. A panel: place it inside the `<MapView>` /
 * `<SceneView>` and lay it out over the map, or anywhere else with the view's ref as `geoView`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <Bookmarks style={{ position: 'absolute', top: 16, right: 16, width: 280, height: 320 }} />
 * </MapView>
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no bookmarks; on Android it renders nothing.
 */
export function Bookmarks(props: BookmarksProps) {
  return availableOn('ios', 'Bookmarks') ? <BookmarksView {...props} /> : null;
}

function BookmarksView({ geoView, onSelectionChange, onIsPresentedChange, ...props }: BookmarksProps) {
  const ref = useGeoViewRef(geoView);
  if (!NativeBookmarks) return null;
  return (
    <NativeBookmarks
      {...props}
      geoView={registryId(ref)}
      onSelectionChange={(event) => onSelectionChange?.(event.nativeEvent.bookmark)}
      onIsPresentedChange={(event) => onIsPresentedChange?.(event.nativeEvent.isPresented)}
    />
  );
}
