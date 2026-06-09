import { Map, MapView, router, type RouteTrackerHandle } from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

/**
 * Turn-by-turn navigation: solve a route into a `RouteTracker`, then feed it a device location with
 * `trackLocation` (normally from `<MapView onLocationChange>`). Each call returns the remaining
 * distance / time and the current voice-guidance text.
 */
export default function RouteTracker() {
  const tracker = useRef<RouteTrackerHandle | null>(null);
  const [status, setStatus] = useState('Tap “Start navigation”.');

  async function start() {
    setStatus('Solving route…');
    tracker.current = await router.createRouteTracker([
      { point: { type: 'point', x: -118.4965, y: 34.0195 }, name: 'Santa Monica' },
      { point: { type: 'point', x: -118.2437, y: 34.0522 }, name: 'Downtown LA' },
    ]);
    const s = await tracker.current.trackLocation({ latitude: 34.0195, longitude: -118.4965, speed: 15 });
    setStatus(
      `${(s.distanceRemaining / 1000).toFixed(1)} km · ${Math.round(s.timeRemaining)} min left · ${
        s.voiceText || s.destinationStatus
      }`
    );
  }

  return (
    <SampleScreen status={status} controls={<Button title="Start navigation" onPress={start} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.04, longitude: -118.37, scale: 600_000 }}>
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
