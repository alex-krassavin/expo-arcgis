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

/** Reads the evaluated popup (title + formatted fields) under a tap via `identifyPopups`. */
export default function Popups() {
  const view = useRef<MapViewHandle>(null);
  const [status, setStatus] = useState('Tap a city.');

  async function showPopupAt(screenPoint: { x: number; y: number }) {
    const popups = await view.current?.identifyPopups(screenPoint, { tolerance: 12, maxResults: 1 });
    const popup = popups?.[0];
    if (!popup) {
      setStatus('No popup here');
      return;
    }
    const fields = popup.fields
      .slice(0, 3)
      .map((f) => `${f.label}: ${f.value}`)
      .join(' · ');
    setStatus(`${popup.title} — ${fields}`);
  }

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 40, longitude: -100, scale: 50_000_000 }}>
        <FeatureLayer url={WORLD_CITIES} />
        <MapView
          ref={view}
          style={{ flex: 1 }}
          onTap={(event: { nativeEvent: TapEventPayload }) => showPopupAt(event.nativeEvent.screenPoint)}
        />
      </Map>
    </SampleScreen>
  );
}
