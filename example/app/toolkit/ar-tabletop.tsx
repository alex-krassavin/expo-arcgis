import { useState } from 'react';
import { Scene, SceneLayer, type Surface } from 'expo-arcgis';
import { TableTopSceneView } from 'expo-arcgis-toolkit';

import { SampleScreen } from '../../src/SampleScreen';
import { describeStatus } from '../../lib/arStatus';

// The Swift Toolkit's tabletop example: Portland's building shells, on a transparent surface the
// camera can go below.
const BUILDINGS =
  'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/DevA_BuildingShells/SceneServer';
const SURFACE: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
  opacity: 0,
  navigationConstraint: 'unconstrained',
};

/**
 * The ArcGIS Toolkit's tabletop AR scene view: find a table with the camera, tap it, and the
 * buildings stand on it at 1:1000. Needs a device with ARKit or ARCore.
 */
export default function TableTopSample() {
  const [status, setStatus] = useState('Point the camera at a table, then tap it to place the scene.');
  return (
    <SampleScreen status={status}>
      <Scene surface={SURFACE}>
        <SceneLayer url={BUILDINGS} />
        <TableTopSceneView
          style={{ flex: 1 }}
          anchorPoint={{ latitude: 45.53257485106716, longitude: -122.68350326165559 }}
          translationFactor={1000}
          clippingDistance={400}
          onInitializationStatusChange={(next) => setStatus(describeStatus(next))}
          onTap={({ nativeEvent }) =>
            setStatus(
              `Tapped ${nativeEvent.mapPoint.latitude.toFixed(5)}, ${nativeEvent.mapPoint.longitude.toFixed(5)}`
            )
          }
        />
      </Scene>
    </SampleScreen>
  );
}
