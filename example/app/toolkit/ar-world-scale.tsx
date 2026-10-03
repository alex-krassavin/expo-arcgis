import { useState } from 'react';
import { Graphic, GraphicsOverlay, Scene, type Surface } from 'expo-arcgis';
import { WorldScaleSceneView } from 'expo-arcgis-toolkit';

import { SampleScreen } from '../../src/SampleScreen';
import { describeStatus } from '../../lib/arStatus';

// As in the Swift Toolkit's world-scale example: imagery and terrain on a transparent surface, so
// the camera feed shows, and only what the app draws appears in the world.
const SURFACE: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
  opacity: 0,
  navigationConstraint: 'unconstrained',
};

type Location = { latitude: number; longitude: number };

/**
 * The ArcGIS Toolkit's world-scale AR scene view: the scene lines up with the world around the
 * device. Tap to drop a marker where the tap meets the ground. Needs a device with ARKit or ARCore.
 */
export default function WorldScaleSample() {
  const [status, setStatus] = useState('Look around, then tap the ground to drop a marker.');
  const [markers, setMarkers] = useState<Location[]>([]);
  return (
    <SampleScreen status={status}>
      <Scene basemap="arcGISImagery" surface={SURFACE}>
        <WorldScaleSceneView
          style={{ flex: 1 }}
          // Above the sample's status panel, which covers the bottom of the view.
          calibrationButtonAlignment="top"
          onInitializationStatusChange={(next) => setStatus(describeStatus(next))}
          onTrackingErrorChange={(error) => error && setStatus(`Tracking: ${error}`)}
          onCalibratingChange={(calibrating) => setStatus(calibrating ? 'Calibrating…' : 'Calibrated.')}
          onTap={({ nativeEvent }) => {
            setMarkers((current) => [...current, nativeEvent.mapPoint]);
            setStatus(`Marker ${markers.length + 1} dropped.`);
          }}
        >
          <GraphicsOverlay>
            {markers.map((marker, index) => (
              <Graphic
                key={index}
                geometry={{ type: 'point', x: marker.longitude, y: marker.latitude }}
                symbol={{
                  type: 'simple-marker',
                  style: 'circle',
                  color: '#e53935',
                  size: 16,
                  outline: { color: '#ffffff', width: 2 },
                }}
              />
            ))}
          </GraphicsOverlay>
        </WorldScaleSceneView>
      </Scene>
    </SampleScreen>
  );
}
