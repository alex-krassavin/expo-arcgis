import { requireNativeView } from 'expo';
import type { FeatureRef } from 'expo-arcgis';
import type { ViewProps } from 'react-native';

import { registryId } from './registryId';

/** An edit the user made through the form's own Save and Discard. */
export type FeatureFormEditingEvent = {
  type: 'savedEdits' | 'discardedEdits';
  /** Whether the form moves on to another form (a related record's) after it. */
  willNavigate: boolean;
};

export type FeatureFormViewProps = ViewProps & {
  /**
   * The feature to edit: the `ref` of a feature from a view's `identify`, in a feature layer that
   * defines a form.
   */
  feature: FeatureRef;
  /**
   * Called when the user saves or discards edits with the form's buttons. Saving keeps the edits on
   * the feature's table; apply them to the service then, as in the Toolkit's examples:
   * `feature.getLayer()`, then `applyEdits()` on its service geodatabase or on the layer.
   */
  onEditingEvent?: (event: FeatureFormEditingEvent) => void;
  /**
   * Called when the user closes the form. On iOS the close button shows only when this is set (the
   * Toolkit's `isPresented` binding).
   */
  onDismiss?: () => void;
  /** When validation errors show: once a field is touched or a save is tried, or always. @default 'automatic' */
  validationErrorVisibility?: 'automatic' | 'visible';
  /** Lets the user open related records' forms and utility network associations. @default true */
  isNavigationEnabled?: boolean;
  /**
   * The Save and Discard buttons: `'automatic'` shows them once there are edits.
   * @default 'automatic' @platform ios — on Android, see `showFormActions`.
   */
  editingButtons?: 'automatic' | 'visible' | 'hidden';
  /** Shows the save and discard actions. @default true @platform android */
  showFormActions?: boolean;
  /** Shows the close icon. @default true @platform android — on iOS, see `onDismiss`. */
  showCloseIcon?: boolean;
};

type NativeFeatureFormViewProps = Omit<
  FeatureFormViewProps,
  'feature' | 'onEditingEvent' | 'onDismiss'
> & {
  /** expo-arcgis's FeatureRef, by registry id. */
  feature: unknown;
  dismissible: boolean;
  onEditingEvent?: (event: { nativeEvent: FeatureFormEditingEvent }) => void;
  onDismiss?: () => void;
};

const NativeFeatureFormView = requireNativeView<NativeFeatureFormViewProps>(
  'ExpoArcgisToolkit',
  'FeatureFormPanelView'
);

/**
 * The ArcGIS Toolkit's feature form: edits a feature's attributes, attachments and related records
 * with the form its layer defines (field types, domains, Arcade expressions, validation), with its
 * own Save and Discard. Pass the `ref` of a feature from the view's `identify`. A panel: lay it out
 * anywhere, in a sheet or below the map.
 *
 * ```tsx
 * <FeatureFormView
 *   feature={feature}
 *   onEditingEvent={async (event) => {
 *     if (event.type !== 'savedEdits') return;
 *     const layer = await feature.getLayer();
 *     const database = await layer?.getServiceGeodatabase();
 *     await (database ?? layer)?.applyEdits();
 *   }}
 *   onDismiss={() => setFeature(null)}
 * />
 * ```
 */
export function FeatureFormView({
  feature,
  onEditingEvent,
  onDismiss,
  ...props
}: FeatureFormViewProps) {
  return (
    <NativeFeatureFormView
      {...props}
      feature={registryId(feature)}
      dismissible={onDismiss != null}
      onEditingEvent={(event) => onEditingEvent?.(event.nativeEvent)}
      onDismiss={() => onDismiss?.()}
    />
  );
}
