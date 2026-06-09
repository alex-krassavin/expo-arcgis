import { DynamicEntityLayer, Map, MapView } from 'expo-arcgis';
import { useRef, useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

// Esri sample real-time stream service (live moving vehicles around the NE US).
const SANDY_RTGIS =
  'https://realtimegis2016.esri.com:6443/arcgis/rest/services/SandyRTGIS/StreamServer';

/**
 * Subscribes to per-entity change events on a live stream. The SDK emits one `received` event per
 * entity as its latest observation arrives (and `purged` when an entity is evicted), so the rate is
 * bounded by the number of tracked entities rather than raw observation throughput.
 */
export default function DynamicEntityChanges() {
  const count = useRef(0);
  const [status, setStatus] = useState('Connecting to the stream…');

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 40.7, longitude: -74, scale: 4_000_000 }}>
        <DynamicEntityLayer
          streamServiceUrl={SANDY_RTGIS}
          onDynamicEntityChange={({ nativeEvent }) => {
            if (nativeEvent.changeType === 'received') count.current += 1;
            setStatus(`Updates: ${count.current} · last change: ${nativeEvent.changeType} #${nativeEvent.entityId}`);
          }}
        />
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
