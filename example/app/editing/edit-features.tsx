import {
  FeatureLayer,
  Map,
  MapView,
  type FeatureLayerHandle,
  type TapEventPayload,
} from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// A public, anonymously-editable feature service (Esri sample).
const WILDFIRE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/0';

/** Adds, moves and deletes a feature on an editable service via the feature-layer ref. */
export default function EditFeatures() {
  const layer = useRef<FeatureLayerHandle>(null);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [editedId, setEditedId] = useState<number | null>(null);
  const [status, setStatus] = useState('Tap the map, then “Add here”.');

  async function add() {
    if (!pin) return setStatus('Tap the map first');
    const id = await layer.current?.addFeature({}, { type: 'point', x: pin.longitude, y: pin.latitude });
    setEditedId(id ?? null);
    setStatus(`Added feature #${id ?? '—'}`);
  }
  async function move() {
    if (editedId == null || !pin) return setStatus('Add a feature, then tap to move it');
    await layer.current?.updateFeature(editedId, {
      geometry: { type: 'point', x: pin.longitude, y: pin.latitude },
    });
    setStatus(`Moved feature #${editedId}`);
  }
  async function remove() {
    if (editedId == null) return setStatus('Add a feature first');
    await layer.current?.deleteFeature(editedId);
    setStatus(`Deleted feature #${editedId}`);
    setEditedId(null);
  }

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          <Button title="Add here" onPress={add} />
          <Button title="Move here" onPress={move} />
          <Button title="Delete" onPress={remove} />
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.05, longitude: -117.18, scale: 1_000_000 }}>
        <FeatureLayer ref={layer} url={WILDFIRE} />
        <MapView
          style={{ flex: 1 }}
          onTap={(event: { nativeEvent: TapEventPayload }) => setPin(event.nativeEvent.mapPoint)}
        />
      </Map>
    </SampleScreen>
  );
}
