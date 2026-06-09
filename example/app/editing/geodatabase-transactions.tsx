import {
  FeatureLayer,
  Map,
  MapView,
  offline,
  type FeatureLayerHandle,
  type GeodatabaseHandle,
} from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

// Transactions operate on a local .geodatabase file — there is no bundled one, so this is a
// button-driven status demo. Supply your own path: download one with `offline.generateGeodatabase`
// (its result `path`), or sideload a `.geodatabase` into the app's documents directory.
const GEODATABASE_PATH = '/path/to/local.geodatabase';

/**
 * Transactional editing of a local mobile geodatabase: open it, `beginTransaction`, make edits, then
 * `commitTransaction` (persist) or `rollbackTransaction` (discard) the whole batch.
 */
export default function GeodatabaseTransactions() {
  const gdb = useRef<GeodatabaseHandle | null>(null);
  const [layer, setLayer] = useState<FeatureLayerHandle | null>(null);
  const [status, setStatus] = useState('Tap “Open” (needs a real .geodatabase path).');

  const run = (fn: () => Promise<void>) => () => {
    fn().catch((e) => setStatus(String(e)));
  };
  const requireGdb = () => {
    if (!gdb.current) throw new Error('Open the geodatabase first');
    return gdb.current;
  };

  const open = run(async () => {
    gdb.current = await offline.openGeodatabase(GEODATABASE_PATH);
    const names = gdb.current.getFeatureTableNames();
    // Display the first table on the map (its edits within a transaction are shown live).
    if (names[0]) setLayer(gdb.current.getFeatureLayer(names[0]));
    setStatus(`Tables: ${names.join(', ') || '—'}`);
  });
  const begin = run(async () => {
    await requireGdb().beginTransaction();
    setStatus(`In transaction: ${requireGdb().isInTransaction()}`);
  });
  const count = run(async () => {
    const handle = requireGdb();
    const name = handle.getFeatureTableNames()[0];
    setStatus(name ? `${name}: ${await handle.queryFeatureCount(name)} features` : 'No tables');
  });
  const rollback = run(async () => {
    await requireGdb().rollbackTransaction();
    setStatus('Rolled back — edits discarded');
  });
  const commit = run(async () => {
    await requireGdb().commitTransaction();
    setStatus('Committed — edits persisted');
  });

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          <Button title="Open" onPress={open} />
          <Button title="Begin" onPress={begin} />
          <Button title="Count" onPress={count} />
          <Button title="Rollback" onPress={rollback} />
          <Button title="Commit" onPress={commit} />
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 5_000_000 }}>
        {layer && <FeatureLayer layer={layer} />}
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
