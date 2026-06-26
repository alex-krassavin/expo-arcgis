import { Graphic, GraphicsOverlay, Map, MapView, offline, type Geometry } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

// A tiled map service that supports tile-cache export.
const TILE_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer';

// The rectangle to estimate (a small area over western Europe).
const AREA: Geometry = {
  type: 'polygon',
  points: [
    { x: -5, y: 52 },
    { x: 9, y: 52 },
    { x: 9, y: 44 },
    { x: -5, y: 44 },
  ],
};

/** Estimates a tile-cache download size BEFORE exporting (offline.estimateTileCacheSize). */
export default function TileCacheEstimate() {
  const [status, setStatus] = useState('Tap “Estimate size”.');

  async function estimate() {
    setStatus('Estimating…');
    try {
      const { fileSizeBytes, tileCount } = await offline.estimateTileCacheSize({
        serviceUrl: TILE_SERVICE,
        area: AREA,
      });
      setStatus(`${(fileSizeBytes / 1_000_000).toFixed(1)} MB · ${tileCount.toLocaleString()} tiles`);
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  return (
    <SampleScreen status={status} controls={<Button title="Estimate size" onPress={estimate} />}>
      <Map basemap="arcGISLightGray" initialViewpoint={{ latitude: 48, longitude: 2, scale: 30_000_000 }}>
        <MapView style={{ flex: 1 }}>
          <GraphicsOverlay>
            <Graphic
              geometry={AREA}
              symbol={{ type: 'simple-fill', color: '#00897b22', outline: { color: '#00897b', width: 1.5 } }}
            />
          </GraphicsOverlay>
        </MapView>
      </Map>
    </SampleScreen>
  );
}
