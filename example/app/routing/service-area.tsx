import { Graphic, GraphicsOverlay, Map, MapView, serviceArea, type Geometry } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// Esri World Service Areas (network analysis) service — needs an API key (applied via <MapSettings>).
const SERVICE_AREA_URL =
  'https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World';

// Lightest ring first so the nested cutoffs stay visible.
const FILLS = ['#5856d611', '#5856d622', '#5856d644'];

/** Computes 5 / 10 / 15-minute drive-time areas from a facility (serviceArea namespace). */
export default function ServiceArea() {
  const [polygons, setPolygons] = useState<Geometry[]>([]);
  const [status, setStatus] = useState('Tap “Solve service areas”.');

  async function solve() {
    setStatus('Solving…');
    try {
      const { polygons: result } = await serviceArea.solve({
        serviceUrl: SERVICE_AREA_URL,
        facilities: [{ type: 'point', x: -118.4, y: 34.05 }],
        cutoffs: [5, 10, 15],
      });
      // Largest cutoff first so smaller rings draw on top.
      setPolygons([...result].sort((a, b) => b.toCutoff - a.toCutoff).map((p) => p.geometry));
      setStatus(`${result.length} reachable-area ring(s)`);
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  return (
    <SampleScreen status={status} controls={<Button title="Solve service areas" onPress={solve} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.05, longitude: -118.4, scale: 300_000 }}>
        <MapView style={{ flex: 1 }}>
          <GraphicsOverlay>
            {polygons.map((geometry, i) => (
              <Graphic
                key={i}
                geometry={geometry}
                symbol={{ type: 'simple-fill', color: FILLS[i % FILLS.length], outline: { color: '#5856d6', width: 1 } }}
              />
            ))}
          </GraphicsOverlay>
        </MapView>
      </Map>
    </SampleScreen>
  );
}
