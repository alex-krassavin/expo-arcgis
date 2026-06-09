import {
  FeatureLayer,
  Map,
  MapView,
  type MapViewHandle,
  type TapEventPayload,
} from 'expo-arcgis';
import { useRef, useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/** Identifies the feature under a tap via the map-view ref. */
export default function Identify() {
  const view = useRef<MapViewHandle>(null);
  const [status, setStatus] = useState('Tap a city.');

  async function identifyAt(screenPoint: { x: number; y: number }) {
    const results = await view.current?.identify(screenPoint, { tolerance: 12, maxResults: 1 });
    const feature = results?.find((r) => r.features.length > 0)?.features[0];
    setStatus(feature ? `Identified: ${String(feature.attributes.CITY_NAME ?? '—')}` : 'Nothing here');
  }

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 40, longitude: -100, scale: 50_000_000 }}>
        <FeatureLayer url={WORLD_CITIES} />
        <MapView
          ref={view}
          style={{ flex: 1 }}
          onTap={(event: { nativeEvent: TapEventPayload }) => identifyAt(event.nativeEvent.screenPoint)}
        />
      </Map>
    </SampleScreen>
  );
}
