import { useState } from 'react';
import { Scene } from 'expo-arcgis';
import { FlyoverSceneView } from 'expo-arcgis-toolkit';

import { SampleScreen } from '../../src/SampleScreen';
import { describeStatus } from '../../lib/arStatus';

// The Swift Toolkit's flyover example: a web scene of Rotterdam, from 1,000 m up.
const ROTTERDAM_WEB_SCENE = '7558ee942b2547019f66885c44d4f0b1';

/**
 * The ArcGIS Toolkit's flyover AR scene view: move the device, and the camera flies over the
 * scene, a meter of movement for each kilometer. Needs a device with ARKit or ARCore.
 */
export default function FlyoverSample() {
  const [status, setStatus] = useState('Move the device to fly over Rotterdam.');
  return (
    <SampleScreen status={status}>
      <Scene portalItem={{ itemId: ROTTERDAM_WEB_SCENE }}>
        <FlyoverSceneView
          style={{ flex: 1 }}
          initialLocation={{ latitude: 51.9244, longitude: 4.4777, altitude: 1000 }}
          translationFactor={1000}
          onInitializationStatusChange={(next) => setStatus(describeStatus(next))}
        />
      </Scene>
    </SampleScreen>
  );
}
