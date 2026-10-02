import { requireNativeView } from 'expo';
import type { PopupRef } from 'expo-arcgis';
import type { ViewProps } from 'react-native';

import { registryId } from './registryId';

export type PopupViewProps = ViewProps & {
  /** The popup to show: the `ref` of a result of a view's `identifyPopups`. */
  popup: PopupRef;
  /**
   * Called when the user closes the popup. On iOS the close button shows only when this is set
   * (the Toolkit's `isPresented` binding).
   */
  onDismiss?: () => void;
  /**
   * Called when the popup shows another one, as when the user follows a utility network
   * association.
   */
  onPopupChange?: (popup: { title: string }) => void;
  /** Shows the close icon. @default true @platform android — on iOS, see `onDismiss`. */
  showCloseIcon?: boolean;
};

type NativePopupViewProps = Omit<PopupViewProps, 'popup' | 'onDismiss' | 'onPopupChange'> & {
  /** expo-arcgis's PopupRef, by registry id. */
  popup: unknown;
  dismissible: boolean;
  onDismiss?: () => void;
  onPopupChange?: (event: { nativeEvent: { title: string } }) => void;
};

const NativePopupView = requireNativeView<NativePopupViewProps>(
  'ExpoArcgisToolkit',
  'PopupPanelView'
);

/**
 * The ArcGIS Toolkit's popup view: a popup's title, fields, media, attachments and related records,
 * with its expressions evaluated. Show the popup of a feature the user taps: pass the `ref` of a
 * result of the view's `identifyPopups`. A panel: lay it out anywhere, in a sheet or below the map.
 *
 * ```tsx
 * const [popup, setPopup] = useState<PopupRef | null>(null);
 *
 * <MapView ref={mapView} onTap={async ({ nativeEvent }) => {
 *   const [result] = await mapView.current!.identifyPopups(nativeEvent.screenPoint);
 *   setPopup(result?.ref ?? null);
 * }} />
 * {popup && <PopupView popup={popup} onDismiss={() => setPopup(null)} style={{ height: 320 }} />}
 * ```
 */
export function PopupView({ popup, onDismiss, onPopupChange, ...props }: PopupViewProps) {
  return (
    <NativePopupView
      {...props}
      popup={registryId(popup)}
      dismissible={onDismiss != null}
      onDismiss={() => onDismiss?.()}
      onPopupChange={(event) => onPopupChange?.(event.nativeEvent)}
    />
  );
}
