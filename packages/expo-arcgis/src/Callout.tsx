import { requireNativeView } from 'expo';
import type { PropsWithChildren } from 'react';
import {
  processColor,
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { FeatureRef, GraphicRef } from './ExpoArcgisModule';
import { useGeoViewFor } from './contexts';
import { sharedObjectId } from './utils/sharedObjectId';

/** A location in WGS84; in a scene, `altitude` (meters) puts it above sea level. */
type CalloutLocation = { latitude: number; longitude: number; altitude?: number };

export type CalloutProps = {
  /** Where the callout points. Ignored while `geoElement` is set. */
  location?: CalloutLocation | null;
  /**
   * What the callout points at, and follows as it moves: a `<Graphic>` ref, or the `ref` of a
   * feature from the view's `identify`.
   */
  geoElement?: GraphicRef | FeatureRef | null;
  /** With `geoElement`: where on it the user tapped, for a line or a polygon. */
  tapLocation?: CalloutLocation | null;
  /** Moves the callout from `location`, right and down, in points. @default { x: 0, y: 0 } */
  offset?: { x: number; y: number };
  /**
   * Turns the offset with the view as it rotates (Swift's `allowsOffsetRotation`).
   * @default false
   */
  rotateOffsetWithGeoView?: boolean;
  /**
   * The content's own style: its padding, width and the like. Where it shows is the callout's to
   * decide.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Where the leader sits on the callout; `'automatic'` picks the side with the most room.
   * @default 'lowerMiddle' @platform android — the Swift callout places its leader itself.
   */
  leaderPosition?:
    | 'automatic'
    | 'upperLeftCorner'
    | 'upperMiddle'
    | 'upperRightCorner'
    | 'rightMiddle'
    | 'lowerRightCorner'
    | 'lowerMiddle'
    | 'lowerLeftCorner'
    | 'leftMiddle';
  /** The Kotlin Toolkit's `CalloutColors`. @default the Material theme's @platform android */
  colors?: { backgroundColor?: ColorValue; borderColor?: ColorValue };
  /**
   * The Kotlin Toolkit's `CalloutShapes`, in dp.
   * @default { cornerRadius: 10, borderWidth: 2, leaderSize: { width: 12, height: 10 } }
   * @platform android
   */
  shapes?: {
    cornerRadius?: number;
    borderWidth?: number;
    leaderSize?: { width: number; height: number };
    /** Padding around the content. @default cornerRadius + borderWidth / 2 */
    contentPadding?: number;
    minSize?: { width: number; height: number };
  };
};

type NativeCalloutProps = Omit<CalloutProps, 'geoElement' | 'colors'> & {
  /** The geo element, by registry id. */
  geoElement?: unknown;
  /** The colors as the ARGB numbers the native side reads. */
  colors?: { backgroundColor?: unknown; borderColor?: unknown };
};

const NativeCallout = requireNativeView<PropsWithChildren<NativeCalloutProps>>(
  'ExpoArcgis',
  'ExpoArcgisCalloutView'
);

/**
 * The SDK's callout: React content its `<MapView>` or `<SceneView>` shows in a bubble pointing at a
 * location or a geo element. It shows while it is mounted and has somewhere to point; a view shows
 * one at a time. Place it directly inside the view.
 *
 * ```tsx
 * <MapView style={{ flex: 1 }} onTap={({ nativeEvent }) => setPicked(nativeEvent.mapPoint)}>
 *   {picked && (
 *     <Callout location={picked}>
 *       <Text>{picked.latitude.toFixed(4)}, {picked.longitude.toFixed(4)}</Text>
 *     </Callout>
 *   )}
 * </MapView>
 * ```
 */
export function Callout({
  geoElement,
  colors,
  style,
  children,
  ...props
}: PropsWithChildren<CalloutProps>) {
  useGeoViewFor('Callout');
  return (
    <NativeCallout
      {...props}
      geoElement={sharedObjectId(geoElement)}
      colors={
        colors && {
          backgroundColor:
            colors.backgroundColor == null ? undefined : processColor(colors.backgroundColor),
          borderColor: colors.borderColor == null ? undefined : processColor(colors.borderColor),
        }
      }
      style={[style, styles.anchor]}>
      {children}
    </NativeCallout>
  );
}

const styles = StyleSheet.create({
  // Takes no room among the view's children, and lays the content out from its own origin: the
  // callout, not this layout, decides where it shows.
  anchor: { position: 'absolute', left: 0, top: 0 },
});
