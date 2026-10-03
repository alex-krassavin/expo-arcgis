import { requireNativeView } from 'expo';
import { useGeoViewRef, type GeoViewHandle } from 'expo-arcgis';
import { useMemo, type ReactNode, type RefObject } from 'react';
import {
  Platform,
  StyleSheet,
  type ColorValue,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

import { availableOn } from './availableOn';
import { registryId } from './registryId';

/**
 * A height where a floating panel rests (the Toolkit's `FloatingPanelDetent`), out of the panel's
 * maximum height.
 */
export type FloatingPanelDetent =
  /** Enough for a short summary: a quarter of the maximum height. */
  | 'summary'
  /** Half of the maximum height. */
  | 'half'
  /** The maximum height. */
  | 'full'
  /** A fraction of the maximum height. */
  | { fraction: number }
  /** A height in points. */
  | { height: number };

export type FloatingPanelProps = ViewProps & {
  /**
   * The panel's content. React lays it out in the panel's size: give it `flex: 1` to fill the
   * panel.
   */
  children?: ReactNode;
  /**
   * The view the panel floats over, whose attribution bar it stays above: a `<MapView>`,
   * `<SceneView>` or `<LocalSceneView>` ref.
   * @default the view the panel is placed in
   */
  geoView?: RefObject<GeoViewHandle | null>;
  /** Whether the panel shows. @default true */
  isPresented?: boolean;
  /**
   * The height the panel rests at. The user can drag the panel to `'summary'`, `'half'` or
   * `'full'`, which `onSelectedDetentChange` reports; to keep the two in step, set it from there.
   * @default 'half', the Toolkit's
   */
  selectedDetent?: FloatingPanelDetent;
  /** Called with the detent the user dragged the panel to. */
  onSelectedDetentChange?: (detent: FloatingPanelDetent) => void;
  /**
   * Where the panel sits across the view, outside portrait: in portrait it spans the view's width.
   * @default 'trailing'
   */
  horizontalAlignment?: 'leading' | 'center' | 'trailing';
  /** The panel's maximum width outside portrait. @default 400 */
  maxWidth?: number;
  /** The panel's background color. @default the system background color */
  backgroundColor?: ColorValue;
  /**
   * The height of the attribution bar at the bottom of the view, which the panel stays above
   * outside portrait.
   * @default the attribution bar of `geoView`, or 0 without one
   */
  attributionBarHeight?: number;
};

/** A detent as the native view takes and reports it. */
type NativeDetent = { kind: 'summary' | 'half' | 'full' | 'fraction' | 'height'; value?: number };

type NativeFloatingPanelProps = Omit<
  FloatingPanelProps,
  'geoView' | 'selectedDetent' | 'onSelectedDetentChange' | 'maxWidth' | 'backgroundColor'
> & {
  /** expo-arcgis's GeoViewRef of the view, by registry id. */
  geoView: unknown;
  selectedDetent?: NativeDetent;
  onSelectedDetentChange?: (event: NativeSyntheticEvent<{ detent: NativeDetent }>) => void;
  // Not `maxWidth` and `backgroundColor`: React Native would also read those as the view's style.
  panelMaxWidth?: number;
  panelBackgroundColor?: ColorValue;
};

// The Kotlin Toolkit has no floating panel: the native views exist on iOS only.
const NativeFloatingPanel =
  Platform.OS === 'ios'
    ? requireNativeView<NativeFloatingPanelProps>('ExpoArcgisToolkit', 'FloatingPanelView')
    : null;
const NativeFloatingPanelContent =
  Platform.OS === 'ios'
    ? requireNativeView<ViewProps>('ExpoArcgisToolkit', 'FloatingPanelContentView')
    : null;

/**
 * The ArcGIS Toolkit's floating panel: React content in a panel that floats over a view, such as
 * a list of places over the map. In portrait it rests at the bottom of the view, as a sheet;
 * elsewhere it floats at its top. The user drags its handle between detents.
 *
 * Place it inside the `<MapView>` / `<SceneView>`: it covers the view, and touches outside the
 * panel reach the map. Elsewhere it floats over the frame you give it (`style`), with the view's
 * ref as `geoView`.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }}>
 *   <FloatingPanel selectedDetent={detent} onSelectedDetentChange={setDetent}>
 *     <FlatList style={{ flex: 1 }} data={places} renderItem={renderPlace} />
 *   </FloatingPanel>
 * </MapView>
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no floating panel; on Android it renders nothing.
 */
export function FloatingPanel(props: FloatingPanelProps) {
  return availableOn('ios', '<FloatingPanel>') ? <FloatingPanelIos {...props} /> : null;
}

function FloatingPanelIos({
  children,
  geoView,
  selectedDetent,
  onSelectedDetentChange,
  maxWidth,
  backgroundColor,
  style,
  ...props
}: FloatingPanelProps) {
  const ref = useGeoViewRef(geoView);
  // A new object each render would move the panel back to it after the user's drag.
  const detentKey = JSON.stringify(selectedDetent ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value
  const nativeDetent = useMemo(() => toNativeDetent(selectedDetent), [detentKey]);
  if (!NativeFloatingPanel || !NativeFloatingPanelContent) return null;
  return (
    <NativeFloatingPanel
      {...props}
      style={[StyleSheet.absoluteFill, style]}
      geoView={registryId(ref)}
      selectedDetent={nativeDetent}
      onSelectedDetentChange={
        onSelectedDetentChange &&
        ((event) => onSelectedDetentChange(fromNativeDetent(event.nativeEvent.detent)))
      }
      panelMaxWidth={maxWidth}
      panelBackgroundColor={backgroundColor}>
      {/* The panel sets its size. */}
      <NativeFloatingPanelContent style={styles.content}>{children}</NativeFloatingPanelContent>
    </NativeFloatingPanel>
  );
}

function toNativeDetent(detent: FloatingPanelDetent | undefined): NativeDetent | undefined {
  if (detent === undefined) return undefined;
  if (typeof detent === 'string') return { kind: detent };
  return 'fraction' in detent
    ? { kind: 'fraction', value: detent.fraction }
    : { kind: 'height', value: detent.height };
}

function fromNativeDetent(detent: NativeDetent): FloatingPanelDetent {
  switch (detent.kind) {
    case 'fraction':
      return { fraction: detent.value ?? 0 };
    case 'height':
      return { height: detent.value ?? 0 };
    default:
      return detent.kind;
  }
}

const styles = StyleSheet.create({
  content: { position: 'absolute', top: 0, left: 0 },
});
