import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapView,
  coordinateFormatter,
  geometryEngine,
  type Geometry,
  type TapEventPayload,
} from 'expo-arcgis';
import { useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

/** Computes a geodesic buffer around the tapped point and reads its lat/long (GeometryEngine + CoordinateFormatter). */
export default function Buffer() {
  const [buffer, setBuffer] = useState<Geometry | null>(null);
  const [status, setStatus] = useState('Tap the map to buffer a point.');

  function onTap(point: { latitude: number; longitude: number }) {
    const geometry = { type: 'point' as const, x: point.longitude, y: point.latitude };
    setBuffer(geometryEngine.geodesicBuffer(geometry, 500, 'meters'));
    const dms = coordinateFormatter.toLatitudeLongitude(geometry, 'degreesMinutesSeconds', 1);
    setStatus(`${dms ?? '—'} · 500 m buffer`);
  }

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.0, longitude: -118.81, scale: 100_000 }}>
        <GraphicsOverlay>
          {buffer && (
            <Graphic
              geometry={buffer}
              symbol={{ type: 'simple-fill', color: '#34c75955', outline: { color: '#34c759', width: 2 } }}
            />
          )}
        </GraphicsOverlay>
        <MapView
          style={{ flex: 1 }}
          onTap={(event: { nativeEvent: TapEventPayload }) => onTap(event.nativeEvent.mapPoint)}
        />
      </Map>
    </SampleScreen>
  );
}
