import type { JobRef } from 'expo-arcgis';

import ExpoArcgisToolkit from './ExpoArcgisToolkitModule';
import { availableOn } from './availableOn';

type JobManagerModule = {
  jobManagerJobs(): Promise<JobRef<unknown>[]>;
  jobManagerAdd(job: JobRef<unknown>): Promise<void>;
  jobManagerRemove(job: JobRef<unknown>): Promise<void>;
  jobManagerResumeAllPausedJobs(): Promise<void>;
  jobManagerSaveState(): Promise<void>;
  jobManagerSetBackgroundStatusCheckInterval(seconds: number | null): Promise<void>;
};

const native = ExpoArcgisToolkit as unknown as JobManagerModule;

/** Whether the job manager is on this platform; elsewhere its functions do nothing and warn once. */
function available() {
  return availableOn('ios', 'jobManager');
}

/**
 * The Swift Toolkit's shared job manager, for expo-arcgis's long jobs (`offline.generateOfflineMap`
 * and the other `JobRef`s).
 *
 * - It keeps the jobs added to it across app launches.
 * - It gives them background time when the app moves to the background.
 * - It can check their status in the background on a schedule.
 *
 * After a relaunch, `jobs()` hands back the jobs it kept: call `result()` on each to follow it to
 * its end.
 *
 * It needs the expo-arcgis-toolkit config plugin with `"jobManager": true`, which permits its
 * background task in Info.plist. Without that, its functions throw.
 *
 * ```ts
 * const job = await offline.generateOfflineMap(map, area, 'my-area');
 * await jobManager.add(job);
 * const { path } = await job.result();
 * await jobManager.remove(job);
 * ```
 *
 * @platform ios — the Kotlin Toolkit has no job manager; on Android its functions do nothing.
 */
export const jobManager = {
  /** The jobs it manages, those it kept across launches included. */
  async jobs(): Promise<JobRef<unknown>[]> {
    return available() ? native.jobManagerJobs() : [];
  },
  /** Manages the job: it is kept across launches until it is removed. Saves the jobs. */
  async add(job: JobRef<unknown>): Promise<void> {
    if (available()) await native.jobManagerAdd(job);
  },
  /** Stops managing the job, typically once it has finished. Saves the jobs. */
  async remove(job: JobRef<unknown>): Promise<void> {
    if (available()) await native.jobManagerRemove(job);
  },
  /** Resumes the jobs that paused (when the app was suspended or terminated). */
  async resumeAllPausedJobs(): Promise<void> {
    if (available()) await native.jobManagerResumeAllPausedJobs();
  },
  /** Saves the jobs now. It also saves them when the app moves to the background or ends. */
  async saveState(): Promise<void> {
    if (available()) await native.jobManagerSaveState();
  },
  /**
   * Checks the jobs' status in the background every `seconds` (the Toolkit's
   * `preferredBackgroundStatusCheckSchedule`); `null` stops it. iOS decides when it actually runs.
   * @default null
   */
  async setBackgroundStatusCheckInterval(seconds: number | null): Promise<void> {
    if (available()) await native.jobManagerSetBackgroundStatusCheckInterval(seconds);
  },
};
