import { Map, MapView, type Viewpoint } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

const SANTA_MONICA: Viewpoint = { latitude: 34.027, longitude: -118.805, scale: 72_000 };
const GRIFFITH: Viewpoint = { latitude: 34.1184, longitude: -118.3004, scale: 40_000 };

/** Animates the map to a new viewpoint at runtime via the `viewpoint` prop. */
export default function ChangeViewpoint() {
  const [viewpoint, setViewpoint] = useState<Viewpoint>(SANTA_MONICA);

  return (
    <SampleScreen
      controls={
        <>
          <Button title="Santa Monica" onPress={() => setViewpoint(SANTA_MONICA)} />
          <Button title="Griffith Obs." onPress={() => setViewpoint(GRIFFITH)} />
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={SANTA_MONICA}>
        <MapView style={{ flex: 1 }} viewpoint={viewpoint} />
      </Map>
    </SampleScreen>
  );
}
