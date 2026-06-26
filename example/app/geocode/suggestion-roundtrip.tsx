import { Map, MapView, geocoder } from 'expo-arcgis';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

import { SampleScreen } from '../../src/SampleScreen';

/**
 * Autocomplete, then geocode the *chosen* suggestion precisely via its `suggestionId` — the SDK
 * reuses the held suggestion instead of re-searching the label text.
 */
export default function SuggestionRoundtrip() {
  const [status, setStatus] = useState('Tap to suggest + geocode “Coffee”.');

  async function run() {
    const suggestions = await geocoder.suggest('Coffee');
    if (!suggestions.length) {
      setStatus('No suggestions');
      return;
    }
    const top = suggestions[0];
    const results = await geocoder.geocodeSuggestion(top.suggestionId);
    setStatus(results.length ? `${top.label} → ${results[0].label}` : `No match for ${top.label}`);
  }

  return (
    <SampleScreen status={status} controls={<Button title="Suggest + geocode “Coffee”" onPress={run} />}>
      <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 2_000_000 }}>
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
