import { DynamicEntityLayer, Map, MapView, type DynamicEntityLayerHandle } from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// Esri sample real-time stream service (live moving vehicles around the NE US).
const SANDY_RTGIS =
  'https://realtimegis2016.esri.com:6443/arcgis/rest/services/SandyRTGIS/StreamServer';

/** Streams live moving entities from a stream service and queries how many are tracked. */
export default function DynamicEntityLayerSample() {
  const layer = useRef<DynamicEntityLayerHandle>(null);
  const [status, setStatus] = useState('Connecting to the stream…');

  async function query() {
    const result = await layer.current?.queryDynamicEntities();
    setStatus(`Tracked entities: ${result?.count ?? 0}`);
  }

  return (
    <SampleScreen status={status} controls={<Button title="Query entities" onPress={query} />}>
      <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 40.7, longitude: -74, scale: 4_000_000 }}>
        <DynamicEntityLayer
          ref={layer}
          streamServiceUrl={SANDY_RTGIS}
          trackDisplay={{ maximumObservations: 5, showsPreviousObservations: true }}
          onConnectionStatusChange={(connectionStatus) => setStatus(`Connection: ${connectionStatus}`)}
        />
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
