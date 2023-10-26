import * as React from 'react';

import { ArcgisViewProps } from './Arcgis.types';

export default function ArcgisView(props: ArcgisViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
