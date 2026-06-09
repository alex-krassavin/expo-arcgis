import { Map, MapView, geocoder } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

/** Autocompletes a partial search into place suggestions (geocoder namespace). */
export default function Suggest() {
  const [status, setStatus] = useState('Tap “Suggest ‘Coffee’”.');

  async function suggest() {
    const results = await geocoder.suggest('Coffee');
    setStatus(results.length ? `Top suggestion: ${results[0].label}` : 'No suggestions');
  }

  return (
    <SampleScreen status={status} controls={<Button title="Suggest “Coffee”" onPress={suggest} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 2_000_000 }}>
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
