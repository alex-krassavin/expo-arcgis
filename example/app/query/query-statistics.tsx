import { FeatureLayer, Map, MapView, type FeatureLayerHandle } from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';

/** Computes an aggregate statistic (average population) over the layer's features. */
export default function QueryStatistics() {
  const layer = useRef<FeatureLayerHandle>(null);
  const [status, setStatus] = useState('Tap “Average population”.');

  async function average() {
    const records = await layer.current?.queryStatistics({
      statistics: [{ field: 'POP', type: 'average', outName: 'avgPop' }],
    });
    const avg = records?.[0]?.statistics.avgPop;
    setStatus(
      typeof avg === 'number'
        ? `Average city population: ${Math.round(avg).toLocaleString()}`
        : 'No result'
    );
  }

  return (
    <SampleScreen status={status} controls={<Button title="Average population" onPress={average} />}>
      <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 20, longitude: 0, scale: 160_000_000 }}>
        <FeatureLayer ref={layer} url={WORLD_CITIES} />
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
