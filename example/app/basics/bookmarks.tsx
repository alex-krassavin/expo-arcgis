import { Map, MapView, type Viewpoint } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// Named saved viewpoints, declared on the map. The buttons navigate to each via the `viewpoint` prop.
const BOOKMARKS: { name: string; viewpoint: Viewpoint }[] = [
  { name: 'Los Angeles', viewpoint: { latitude: 34.05, longitude: -118.24, scale: 200_000 } },
  { name: 'San Francisco', viewpoint: { latitude: 37.77, longitude: -122.42, scale: 200_000 } },
  { name: 'New York', viewpoint: { latitude: 40.71, longitude: -74.0, scale: 200_000 } },
];

/** Declares named bookmarks on the map and navigates to them. */
export default function Bookmarks() {
  const [viewpoint, setViewpoint] = useState<Viewpoint | undefined>(undefined);
  const [status, setStatus] = useState('Pick a bookmark.');

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          {BOOKMARKS.map((b) => (
            <Button
              key={b.name}
              title={b.name}
              onPress={() => {
                setViewpoint(b.viewpoint);
                setStatus(b.name);
              }}
            />
          ))}
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={BOOKMARKS[0].viewpoint} bookmarks={BOOKMARKS}>
        <MapView style={{ flex: 1 }} viewpoint={viewpoint} />
      </Map>
    </SampleScreen>
  );
}
