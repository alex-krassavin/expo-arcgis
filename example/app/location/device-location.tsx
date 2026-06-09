import { Map, MapView, type Geometry, type LocationEventPayload } from 'expo-arcgis';
import { useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

// A short route the simulated location data source follows (Santa Monica Mountains).
const ROUTE: Geometry = {
  type: 'polyline',
  points: [
    { x: -118.805, y: 34.0 },
    { x: -118.8, y: 34.005 },
    { x: -118.795, y: 34.01 },
    { x: -118.79, y: 34.012 },
  ],
};

/** Shows a moving device position from a simulated location data source, auto-panning to follow it. */
export default function DeviceLocation() {
  const [status, setStatus] = useState('Following a simulated route…');

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.006, longitude: -118.8, scale: 40_000 }}>
        <MapView
          style={{ flex: 1 }}
          locationDisplay={{ source: { type: 'simulated', route: ROUTE }, autoPanMode: 'navigation' }}
          onLocationChange={(event: { nativeEvent: LocationEventPayload }) =>
            setStatus(
              `Location ${event.nativeEvent.position.latitude.toFixed(4)}, ${event.nativeEvent.position.longitude.toFixed(4)}`
            )
          }
        />
      </Map>
    </SampleScreen>
  );
}
