import {
  Map,
  MapView,
  UtilityNetwork,
  setTokenCredential,
  type UtilityNetworkHandle,
  type UtilityTraceType,
} from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

// Esri sample Naperville electric utility network (token-secured; public sample login).
const NAPERVILLE_UN =
  'https://sampleserver7.arcgisonline.com/server/rest/services/UtilityNetwork/NapervilleElectric/FeatureServer';
const UN_LOGIN = { username: 'viewer01', password: 'I68VGU^nMurF' };

/** Loads a utility network (token auth) and runs connected / downstream traces. */
export default function UtilityNetworkSample() {
  const un = useRef<UtilityNetworkHandle>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('Tap “Load network”.');

  function load() {
    // Store the login; the challenge handler authenticates the service when it loads.
    setTokenCredential(UN_LOGIN.username, UN_LOGIN.password);
    setLoaded(true);
  }

  async function trace(type: UtilityTraceType) {
    if (!un.current) return setStatus('Load the network first');
    setStatus(`Tracing (${type})…`);
    try {
      const result = await un.current.traceFromQuery('Electric Distribution Device', '1=1', type);
      setStatus(`Trace ${type}: ${result.elementCount} element(s)`);
    } catch (e) {
      setStatus(`Trace error: ${String(e)}`);
    }
  }

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          <Button title="Load network" onPress={load} />
          <Button title="Connected" onPress={() => trace('connected')} />
          <Button title="Downstream" onPress={() => trace('downstream')} />
        </>
      }
    >
      <Map basemap="arcGISStreets" initialViewpoint={{ latitude: 41.7745, longitude: -88.145, scale: 12_000 }}>
        {loaded && (
          <UtilityNetwork
            ref={un}
            serviceGeodatabaseUrl={NAPERVILLE_UN}
            onLoad={(name) => setStatus(`Loaded: ${name}`)}
            onLoadError={(message) => setStatus(`Load error: ${message}`)}
          />
        )}
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
