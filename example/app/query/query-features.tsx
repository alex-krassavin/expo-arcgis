import { FeatureLayer, Map, MapView, type FeatureLayerHandle } from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/** Counts the features matching a SQL `where` clause via the feature-layer ref. */
export default function QueryFeatures() {
  const layer = useRef<FeatureLayerHandle>(null);
  const [status, setStatus] = useState('Tap “Count cities > 5M”.');

  async function count() {
    const n = await layer.current?.queryFeatureCount({ whereClause: 'POP > 5000000' });
    setStatus(`Cities over 5M people: ${n ?? '—'}`);
  }

  return (
    <SampleScreen status={status} controls={<Button title="Count cities > 5M" onPress={count} />}>
      <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
        <FeatureLayer ref={layer} url={WORLD_CITIES} />
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
