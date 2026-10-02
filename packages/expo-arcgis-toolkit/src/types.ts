/**
 * Where a component drawn over a `<MapView>` sits. Leading and trailing follow the layout direction,
 * so `topTrailing` is the top right in a left-to-right layout. The view's `contentInsets` are kept
 * clear.
 */
export type AccessoryAlignment =
  | 'topLeading'
  | 'top'
  | 'topTrailing'
  | 'leading'
  | 'center'
  | 'trailing'
  | 'bottomLeading'
  | 'bottom'
  | 'bottomTrailing';
