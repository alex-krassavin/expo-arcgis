import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapView,
  geoprocessor,
  type Feature,
  type Geometry,
} from 'expo-arcgis';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

// Esri sample Viewshed geoprocessing service — observation point + distance → visible polygons.
const VIEWSHED_GP =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Elevation/ESRI_Elevation_World/GPServer/Viewshed';

/** Runs a geoprocessing task (Viewshed) and draws the result polygons (geoprocessor namespace). */
export default function Geoprocessing() {
  const [polygons, setPolygons] = useState<Geometry[]>([]);
  const [status, setStatus] = useState('Tap “Run viewshed”.');

  async function run() {
    setStatus('Running viewshed…');
    try {
      const job = await geoprocessor.execute(VIEWSHED_GP, {
        Input_Observation_Point: {
          type: 'features',
          geometries: [{ type: 'point', x: -118.49, y: 34.05 }],
        },
        Viewshed_Distance: { type: 'linearUnit', value: 2, unit: 'miles' },
      });
      const { outputs } = await job.result();
      const features = (outputs.Viewshed_Result as Feature[] | undefined) ?? [];
      const result = features.map((f) => f.geometry).filter((g): g is Geometry => g != null);
      setPolygons(result);
      setStatus(`${result.length} visible polygon(s)`);
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
    }
  }

  return (
    <SampleScreen status={status} controls={<Button title="Run viewshed" onPress={run} />}>
      <Map basemap="arcGISImagery" initialViewpoint={{ latitude: 34.05, longitude: -118.49, scale: 200_000 }}>
        <MapView style={{ flex: 1 }}>
          <GraphicsOverlay>
            {polygons.map((geometry, i) => (
              <Graphic
                key={i}
                geometry={geometry}
                symbol={{ type: 'simple-fill', color: '#ffb70366', outline: { color: '#ff6b00', width: 1 } }}
              />
            ))}
          </GraphicsOverlay>
        </MapView>
      </Map>
    </SampleScreen>
  );
}
