import { Graphic, GraphicsOverlay, Map, MapView, geocoder, type Geometry } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

/** Forward-geocodes an address to a point and marks it (geocoder namespace). */
export default function Geocode() {
  const [location, setLocation] = useState<Geometry | null>(null);
  const [status, setStatus] = useState('Tap “Find Los Angeles”.');

  async function find() {
    const [result] = await geocoder.geocode('Los Angeles, CA');
    if (result?.location) {
      setLocation(result.location);
      setStatus(`${result.label} (score ${Math.round(result.score)})`);
    } else setStatus('No result');
  }

  return (
    <SampleScreen status={status} controls={<Button title="Find Los Angeles" onPress={find} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 3_000_000 }}>
        <MapView style={{ flex: 1 }}>
          <GraphicsOverlay>
            {location && (
              <Graphic
                geometry={location}
                symbol={{ type: 'simple-marker', style: 'diamond', color: '#5856d6', size: 16 }}
              />
            )}
          </GraphicsOverlay>
        </MapView>
      </Map>
    </SampleScreen>
  );
}
