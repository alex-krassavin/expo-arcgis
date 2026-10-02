import type { PropsWithChildren } from 'react';

import type { CalloutProps } from './Callout';

// ArcGIS native map rendering, and so its callout, is not available on the web platform.
export function Callout(_props: PropsWithChildren<CalloutProps>) {
  throw new Error('Callout is not available on the web platform.');
}
