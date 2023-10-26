import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ArcgisViewProps } from './Arcgis.types';

const NativeView: React.ComponentType<ArcgisViewProps> =
  requireNativeViewManager('Arcgis');

export default function ArcgisView(props: ArcgisViewProps) {
  return <NativeView {...props} />;
}
