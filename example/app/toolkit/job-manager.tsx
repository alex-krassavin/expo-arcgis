import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { offline, type JobRef } from 'expo-arcgis';
import { jobManager } from 'expo-arcgis-toolkit';
import { Button } from '../../components/ui/button';

// The offline-enabled web map of the Toolkit's offline examples; its first preplanned area is small.
const WEB_MAP_ID = 'acc027394bc84c2fb04d1ed317aac674';

type Row = { job: JobRef<unknown>; progress: number; result?: string };

/**
 * The Swift Toolkit's job manager: download a preplanned map area as a managed job. Close the app
 * while it downloads, and on the next launch the job comes back (`jobManager.jobs()`), resumes and
 * finishes. iOS only.
 */
export default function JobManagerSample() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('Loading the managed jobs…');

  function follow(job: JobRef<unknown>) {
    setRows((current) => [...current.filter((row) => row.job !== job), { job, progress: 0 }]);
    job.addListener('onProgress', ({ progress }) =>
      setRows((current) => current.map((row) => (row.job === job ? { ...row, progress } : row)))
    );
    job
      .result()
      .then((result) => JSON.stringify(result))
      .catch((error) => `failed: ${String(error)}`)
      .then((result) =>
        setRows((current) => current.map((row) => (row.job === job ? { ...row, result } : row)))
      );
  }

  useEffect(() => {
    // The jobs the manager kept across launches: resume the paused ones and follow them.
    jobManager
      .jobs()
      .then(async (jobs) => {
        await jobManager.resumeAllPausedJobs();
        jobs.forEach(follow);
        setStatus(`${jobs.length} managed job(s) kept from before`);
      })
      .catch((error) => setStatus(String(error)));
  }, []);

  async function download() {
    try {
      const job = await offline.downloadPreplannedOfflineMap(WEB_MAP_ID, 0, `managed-${Date.now()}`);
      await jobManager.add(job);
      follow(job);
      setStatus('Downloading as a managed job — close the app to try it');
    } catch (error) {
      setStatus(String(error));
    }
  }

  async function removeFinished() {
    const finished = rows.filter((row) => row.result);
    await Promise.all(finished.map((row) => jobManager.remove(row.job)));
    setRows((current) => current.filter((row) => !row.result));
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.buttons}>
        <Button title="Download area" onPress={download} />
        <Button title="Remove finished" onPress={removeFinished} />
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.title}>Job {index + 1}</Text>
          <Text>{row.result ?? `${row.progress}%`}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  status: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  buttons: { flexDirection: 'row', gap: 8 },
  row: { padding: 12, borderRadius: 10, backgroundColor: 'white', gap: 4 },
  title: { fontWeight: '700' },
});
