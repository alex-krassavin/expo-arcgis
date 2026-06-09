import {
  FeatureLayer,
  Map,
  MapView,
  type FeatureLayerHandle,
  type ServiceGeodatabaseHandle,
} from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// Branch versioning is an ArcGIS *Enterprise* feature — there is no anonymous public branch-versioned
// service. This demo points at a normal hosted service so the flow runs end-to-end: "Connect" works,
// but `supportsBranchVersioning()` reports false and the version operations surface the SDK error.
// To exercise it for real, swap in your own branch-versioned FeatureServer URL and sign in first with
// `auth.setServiceCredential(url, user, pass)` (see the Authentication sample).
const SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/0';

/**
 * Branch versioning: get the layer's service geodatabase, list / create / switch named versions, and
 * push service-wide local edits to the active version. Edit features through the layer with
 * `apply: false`, then `applyEdits()` here.
 */
export default function BranchVersioning() {
  const layer = useRef<FeatureLayerHandle>(null);
  const gdb = useRef<ServiceGeodatabaseHandle | null>(null);
  const [status, setStatus] = useState('Tap “Connect”.');

  const run = (fn: () => Promise<void>) => () => {
    fn().catch((e) => setStatus(String(e)));
  };

  const requireGdb = () => {
    if (!gdb.current) throw new Error('Connect first');
    return gdb.current;
  };

  const connect = run(async () => {
    const handle = await layer.current?.getServiceGeodatabase();
    if (!handle) return setStatus('Layer not ready');
    gdb.current = handle;
    const supported = handle.supportsBranchVersioning();
    setStatus(
      `Connected — version "${handle.getVersionName()}"` +
        (supported ? '' : ' · branch versioning NOT supported by this service')
    );
  });

  const versions = run(async () => {
    const list = await requireGdb().fetchVersions();
    setStatus(`${list.length} version(s): ${list.map((v) => v.name).join(', ') || '—'}`);
  });

  const create = run(async () => {
    const info = await requireGdb().createVersion({ name: `demo_${Date.now()}`, access: 'public' });
    setStatus(`Created "${info.name}" (${info.access})`);
  });

  const switchDefault = run(async () => {
    const handle = requireGdb();
    if (handle.hasLocalEdits()) return setStatus('Apply or undo local edits first');
    await handle.switchVersion(handle.getDefaultVersionName());
    setStatus(`Switched to "${handle.getVersionName()}"`);
  });

  const localEdit = run(async () => {
    const id = await layer.current?.addFeature({}, { type: 'point', x: -117.18, y: 34.05 }, false);
    setStatus(`Local edit added (#${id ?? '—'}); pending: ${requireGdb().hasLocalEdits()}`);
  });

  const apply = run(async () => {
    const results = await requireGdb().applyEdits();
    setStatus(`Applied ${results.length} edit(s) to "${requireGdb().getVersionName()}"`);
  });

  const undo = run(async () => {
    await requireGdb().undoLocalEdits();
    setStatus('Local edits discarded');
  });

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          <Button title="Connect" onPress={connect} />
          <Button title="Versions" onPress={versions} />
          <Button title="Create" onPress={create} />
          <Button title="Switch → default" onPress={switchDefault} />
          <Button title="Local edit" onPress={localEdit} />
          <Button title="Apply" onPress={apply} />
          <Button title="Undo" onPress={undo} />
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.05, longitude: -117.18, scale: 1_000_000 }}>
        <FeatureLayer ref={layer} url={SERVICE} />
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
