import { requireNativeView } from 'expo';
import {
  useGeoViewRef,
  type GraphicsOverlayRef,
  type MapViewHandle,
  type SceneViewHandle,
} from 'expo-arcgis';
import { useEffect, useState, type RefObject } from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

import { availableOn } from './availableOn';
import { registryId } from './registryId';

/**
 * Where the search looks. Settings left out keep the Toolkit's defaults: the world geocoder, 6
 * results and 6 suggestions.
 */
export type SearchSource =
  | {
      /** The Toolkit's `LocatorSearchSource`: a geocode service. */
      type: 'locator';
      /** The geocode service. @default the ArcGIS World Geocoding Service */
      url?: string;
      /** The name shown for the source. */
      name?: string;
      maximumResults?: number;
      maximumSuggestions?: number;
    }
  | {
      /**
       * The Toolkit's `SmartLocatorSearchSource`: the world geocoder, searching again with looser
       * settings when it finds too few results.
       */
      type: 'smartLocator';
      name?: string;
      maximumResults?: number;
      maximumSuggestions?: number;
      /** The fewest results to try for; `null` searches once. @default 1 */
      repeatSearchResultThreshold?: number | null;
      /** The fewest suggestions to try for; `null` suggests once. @default 6 */
      repeatSuggestResultThreshold?: number | null;
    };

export type SearchProps = ViewProps & {
  /**
   * The view the search is for, which moves to the results: a `<MapView>` or `<SceneView>` ref.
   * @default the view the search is placed in
   */
  geoView?: RefObject<MapViewHandle | SceneViewHandle | null>;
  /** Where to search. @default the Toolkit's: the world geocoder */
  sources?: SearchSource[];
  /**
   * The overlay the results are drawn into: a `<GraphicsOverlay>` ref, declared in the view. Without
   * one, the results show in the list only, as in the Toolkit.
   */
  resultsOverlay?: RefObject<GraphicsOverlayRef | null>;
  /** Shows the Toolkit's list of results. @default true */
  enableResultListView?: boolean;
  /** Shown in the empty field. @default the Toolkit's ("Find a place or address", localized) */
  prompt?: string;
  /** Shown when nothing is found. @default the Toolkit's ("No results found", localized) */
  noResultsMessage?: string;
  /** The query the search starts with. */
  currentQuery?: string;
  /**
   * How many results a search returns: one, several, or (`'automatic'`) what the query suggests.
   * @default 'automatic'
   */
  resultMode?: 'single' | 'multiple' | 'automatic';
  /**
   * Offers "Repeat search here" once the view has moved away from the results (the Toolkit's
   * `geoViewExtent` and `isGeoViewNavigating`, from the view). @default false
   */
  repeatSearch?: boolean;
  /**
   * Where results are prioritized: `'view'` for the view's center as it moves, or a point.
   * @default none
   */
  queryCenter?: 'view' | { latitude: number; longitude: number };
  /** Called with the query as the user types it. */
  onQueryChange?: (query: string) => void;
};

type NativeSearchProps = Omit<
  SearchProps,
  'geoView' | 'resultsOverlay' | 'queryCenter' | 'onQueryChange'
> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
  /** expo-arcgis's GraphicsOverlayRef, by registry id. */
  resultsOverlay: unknown;
  queryCenterFromView: boolean;
  queryCenter?: { latitude: number; longitude: number };
  onQueryChange?: (event: NativeSyntheticEvent<{ query: string }>) => void;
};

// The Kotlin Toolkit has no search: the native view exists on iOS only.
const NativeSearch =
  Platform.OS === 'ios'
    ? requireNativeView<NativeSearchProps>('ExpoArcgisToolkit', 'SearchPanelView')
    : null;

/**
 * The ArcGIS Toolkit's search: a field with suggestions as you type, that searches its sources
 * (the world geocoder by default) and moves the view to the results. A panel: place it inside the
 * `<MapView>` / `<SceneView>` and lay it out over the map, or anywhere else with the view's ref as
 * `geoView`. To draw the results on the map, declare a `<GraphicsOverlay>` in the view and pass its
 * ref as `resultsOverlay`.
 *
 * ```tsx
 * const results = useRef<GraphicsOverlayRef>(null);
 *
 * <MapView style={{ flex: 1 }}>
 *   <GraphicsOverlay ref={results} />
 *   <Search
 *     resultsOverlay={results}
 *     queryCenter="view"
 *     repeatSearch
 *     style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
 *   />
 * </MapView>
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no search; on Android it renders nothing.
 */
export function Search(props: SearchProps) {
  return availableOn('ios', 'Search') ? <SearchPanel {...props} /> : null;
}

function SearchPanel({
  geoView,
  resultsOverlay,
  queryCenter,
  onQueryChange,
  ...props
}: SearchProps) {
  const ref = useGeoViewRef(geoView);
  // React fills a ref in once its component mounts, after this one renders: read it in an effect.
  const [overlay, setOverlay] = useState<GraphicsOverlayRef | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the ref is only filled in at commit
    setOverlay(resultsOverlay?.current ?? null);
  }, [resultsOverlay]);
  if (!NativeSearch) return null;
  return (
    <NativeSearch
      {...props}
      geoView={registryId(ref)}
      resultsOverlay={registryId(overlay)}
      queryCenterFromView={queryCenter === 'view'}
      queryCenter={typeof queryCenter === 'object' ? queryCenter : undefined}
      onQueryChange={(event) => onQueryChange?.(event.nativeEvent.query)}
    />
  );
}
