import { processColor, type ColorValue } from 'react-native';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import type { AccessoryAlignment } from './types';
import { useAccessory } from './useAccessory';

/** What a floor filter has selected: a site, and within it a facility and one of its levels. */
export type FloorFilterSelection = {
  site?: { id: string; name: string } | null;
  facility?: { id: string; name: string } | null;
  level?: { id: string; longName: string; shortName: string; verticalOrder: number };
};

/**
 * The Kotlin Toolkit's `UIProperties`: how the floor filter looks. What is left out keeps the
 * Toolkit's default.
 */
export type FloorFilterUIProperties = {
  /** The selected level's background. @default '#E2F1FB' */
  selectedBackgroundColor?: ColorValue;
  /** The selected level's text. @default '#005E95' */
  selectedForegroundColor?: ColorValue;
  /** The site and facility search field's background. @default '#EEEEEE' */
  searchBackgroundColor?: ColorValue;
  /** @default 'darkgray' */
  textColor?: ColorValue;
  /** @default 'white' */
  backgroundColor?: ColorValue;
  /** How many levels show before the list scrolls; less than 1 shows them all. @default -1 */
  maxDisplayLevels?: number;
  /** The button that opens the site and facility list. @default 'visible' */
  siteFacilityButtonVisibility?: 'visible' | 'invisible' | 'gone';
  /** The button that collapses the level list. @default 'visible' */
  closeButtonVisibility?: 'visible' | 'invisible' | 'gone';
  /** Whether the close button sits above or below the level list. @default 'top' */
  closeButtonPosition?: 'top' | 'bottom';
  /** The size of each button (a level, close, sites), in dp. @default { width: 60, height: 40 } */
  buttonSize?: { width?: number; height?: number };
};

export type FloorFilterProps = {
  /** Where in the view the floor filter sits. @default 'bottomLeading' */
  alignment?: AccessoryAlignment;
  /**
   * Whether navigating the view selects the facility in view. `'alwaysNotClearing'` keeps the last
   * selection when no facility is in view. @default 'always'
   * @platform ios — the Kotlin Toolkit selects by taps only.
   */
  automaticSelectionMode?: 'always' | 'alwaysNotClearing' | 'never';
  /**
   * Keeps the floor filter from selecting the site by itself when the floor-aware data has only one.
   * @default false
   * @platform ios — the Kotlin Toolkit doesn't select a site by itself.
   */
  automaticSingleSiteSelectionDisabled?: boolean;
  /**
   * The width of the level list, in points. @default the Toolkit's width
   * @platform ios — on Android, see `uiProperties.buttonSize`.
   */
  levelSelectorWidth?: number;
  /**
   * How the floor filter looks: colors, button size, which buttons show, how many levels show.
   * @platform android — the Swift Toolkit's floor filter has the system's look.
   */
  uiProperties?: FloorFilterUIProperties;
  /** Called with each selection: a site, a facility or a level. */
  onSelectionChange?: (selection: FloorFilterSelection) => void;
};

/**
 * The ArcGIS Toolkit's floor filter, drawn over its `<MapView>` or `<SceneView>`. For a map or scene
 * with floor-aware data, it browses sites, facilities and levels, and shows only the selected level's
 * features. Choosing a site or facility moves the view to it. Place it inside the view; it appears
 * once the map or scene has loaded and has a floor manager.
 *
 * ```tsx
 * <Map portalItem={{ itemId: 'b4b599a43a474d33946cf0df526426f5' }}>
 *   <MapView style={{ flex: 1 }}>
 *     <FloorFilter onSelectionChange={(selection) => console.log(selection.level?.longName)} />
 *   </MapView>
 * </Map>
 * ```
 */
export function FloorFilter({
  alignment = 'bottomLeading',
  automaticSelectionMode = 'always',
  automaticSingleSiteSelectionDisabled = false,
  levelSelectorWidth,
  uiProperties,
  onSelectionChange,
}: FloorFilterProps) {
  useAccessory(
    () => new ExpoArcgisToolkit.FloorFilterAccessory(),
    {
      alignment,
      automaticSelectionMode,
      automaticSingleSiteSelectionDisabled,
      levelSelectorWidth,
      uiProperties: uiProperties && nativeUIProperties(uiProperties),
    },
    { selectionChange: onSelectionChange }
  );
  return null;
}

const COLORS = [
  'selectedBackgroundColor',
  'selectedForegroundColor',
  'searchBackgroundColor',
  'textColor',
  'backgroundColor',
] as const;

/** The UI properties with their colors as the ARGB numbers the native side reads. */
function nativeUIProperties(properties: FloorFilterUIProperties): Record<string, unknown> {
  const native: Record<string, unknown> = { ...properties };
  for (const key of COLORS) {
    if (properties[key] != null) native[key] = processColor(properties[key]);
  }
  return native;
}
