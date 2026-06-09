import { AnalysisOverlay, LineOfSight, Scene, SceneView, type Camera, type Surface } from 'expo-arcgis';
import { useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

const CAMERA: Camera = {
  position: { x: -118.804, y: 34.0, z: 5330 },
  heading: 355,
  pitch: 72,
  roll: 0,
};

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
  elevationExaggeration: 2.5,
};

/** Tests visibility between an observer and a target over terrain, reporting it via an event. */
export default function LineOfSightSample() {
  const [status, setStatus] = useState('Computing line of sight…');

  return (
    <SampleScreen status={status}>
      <Scene basemap="arcGISImagery" camera={CAMERA} surface={ELEVATION}>
        <SceneView style={{ flex: 1 }}>
          <AnalysisOverlay>
            <LineOfSight
              observer={{ type: 'point', x: -118.80657, y: 34.00059, z: 1200 }}
              target={{ type: 'point', x: -118.83, y: 34.012, z: 700 }}
              onTargetVisibilityChange={(visibility) => setStatus(`Target is ${visibility}`)}
            />
          </AnalysisOverlay>
        </SceneView>
      </Scene>
    </SampleScreen>
  );
}
