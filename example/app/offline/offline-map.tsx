import {
  Map,
  MapView,
  offline,
  type Geometry,
  type JobRef,
  type OfflineMapResult,
} from 'expo-arcgis';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

// Esri sample offline-enabled web map (Naperville) + a small area of interest.
const OFFLINE_WEBMAP = 'acc027394bc84c2fb04d1ed317aac674';
const OFFLINE_AREA: Geometry = {
  type: 'envelope',
  xMin: -88.1526,
  yMin: 41.7694,
  xMax: -88.1387,
  yMax: 41.7799,
};

/** Generates an on-demand offline map (progress + cancel) and displays the downloaded package. */
export default function OfflineMap() {
  const [path, setPath] = useState<string | null>(null);
  const [job, setJob] = useState<JobRef<OfflineMapResult> | null>(null);
  const [status, setStatus] = useState('Tap “Take offline”.');

  async function takeOffline() {
    setStatus('Taking map offline… 0%');
    try {
      const newJob = await offline.generateOfflineMap(OFFLINE_WEBMAP, OFFLINE_AREA, 'offlineMap1');
      setJob(newJob);
      const subscription = newJob.addListener('onProgress', ({ progress }) =>
        setStatus(`Taking map offline… ${progress}%`)
      );
      const result = await newJob.result();
      subscription.remove();
      setJob(null);
      if (result.path) {
        setPath(result.path);
        setStatus('Offline map downloaded ✅');
      } else setStatus('No package path returned');
    } catch (e) {
      setJob(null);
      setStatus(`Offline error/cancelled: ${String(e)}`);
    }
  }

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          {!path && <Button title="Take offline" onPress={takeOffline} />}
          {job && <Button title="Cancel" onPress={() => job.cancel()} />}
          {path && <Button title="Back online" onPress={() => setPath(null)} />}
        </>
      }
    >
      {path ? (
        <Map mobileMapPackagePath={path}>
          <MapView style={{ flex: 1 }} />
        </Map>
      ) : (
        <Map portalItem={{ itemId: OFFLINE_WEBMAP }}>
          <MapView style={{ flex: 1 }} />
        </Map>
      )}
    </SampleScreen>
  );
}
