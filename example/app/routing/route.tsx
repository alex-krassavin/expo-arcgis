import { Graphic, GraphicsOverlay, Map, MapView, router, type Geometry } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

/** Solves a route between two stops and draws it with turn-by-turn metrics (router namespace). */
export default function Route() {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [status, setStatus] = useState('Tap “Solve route”.');

  async function solve() {
    const { routes } = await router.solveRoute([
      { point: { type: 'point', x: -118.4965, y: 34.0195 }, name: 'Santa Monica' },
      { point: { type: 'point', x: -118.2437, y: 34.0522 }, name: 'Downtown LA' },
    ]);
    const route = routes[0];
    if (route?.geometry) {
      setGeometry(route.geometry);
      setStatus(
        `${(route.totalLength / 1000).toFixed(1)} km · ${Math.round(route.travelTime)} min · ${route.directions.length} steps`
      );
    } else setStatus('No route found');
  }

  return (
    <SampleScreen status={status} controls={<Button title="Solve route" onPress={solve} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.04, longitude: -118.37, scale: 600_000 }}>
        <GraphicsOverlay>
          {geometry && (
            <Graphic geometry={geometry} symbol={{ type: 'simple-line', color: '#5856d6', width: 4 }} />
          )}
        </GraphicsOverlay>
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
