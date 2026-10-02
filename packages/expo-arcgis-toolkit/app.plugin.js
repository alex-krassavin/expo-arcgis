// Config plugin for expo-arcgis-toolkit: what the toolkit's components need from the app.
// List it in app.json (`"plugins": ["expo-arcgis", "expo-arcgis-toolkit"]`), then rebuild the app.
const { AndroidConfig, withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

// The background task of the Swift Toolkit's offline manager (OfflineMapAreas), and its continued
// processing tasks (iOS 26).
const OFFLINE_TASKS = [
  'com.esri.ArcGISToolkit.jobManager.offlineManager.statusCheck',
  '$(PRODUCT_BUNDLE_IDENTIFIER).cpt.jobs.*',
];

// The background task of the Swift Toolkit's shared job manager (jobManager).
const JOB_MANAGER_TASK = 'com.esri.ArcGISToolkit.jobManager.statusCheck';

// What the Kotlin Toolkit's offline downloads (foreground WorkManager jobs) need.
const OFFLINE_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.POST_NOTIFICATIONS',
];

/** Adds the values missing from an array entry of a plist or manifest. */
function addAll(list, values) {
  const result = Array.isArray(list) ? [...list] : [];
  for (const value of values) if (!result.includes(value)) result.push(value);
  return result;
}

/**
 * - iOS: usage descriptions for the feature form's camera and microphone (attachments, barcodes);
 *   and, for OfflineMapAreas, the offline manager's background task and background fetch.
 * - Android: OfflineMapAreas' download permissions.
 * - With `jobManager: true` (iOS), the shared job manager's background task and background fetch.
 *
 * Entries the app already has are kept. Pass `false` to leave a description out, or
 * `offlineMapAreas: false` to leave out what OfflineMapAreas needs.
 *
 * @param {import('expo/config').ExpoConfig} config
 * @param {{
 *   cameraUsageDescription?: string | false,
 *   microphoneUsageDescription?: string | false,
 *   offlineMapAreas?: boolean,
 *   jobManager?: boolean,
 * }} [props]
 */
function withArcGISToolkit(config, props = {}) {
  const camera =
    props.cameraUsageDescription ??
    'Allow $(PRODUCT_NAME) to use the camera for feature attachments and barcodes.';
  const microphone =
    props.microphoneUsageDescription ??
    'Allow $(PRODUCT_NAME) to record audio for video attachments.';
  const offline = props.offlineMapAreas !== false;
  const jobManager = props.jobManager === true;

  config = withInfoPlist(config, (cfg) => {
    if (camera !== false) {
      cfg.modResults.NSCameraUsageDescription = cfg.modResults.NSCameraUsageDescription ?? camera;
    }
    if (microphone !== false) {
      cfg.modResults.NSMicrophoneUsageDescription =
        cfg.modResults.NSMicrophoneUsageDescription ?? microphone;
    }
    const tasks = [...(offline ? OFFLINE_TASKS : []), ...(jobManager ? [JOB_MANAGER_TASK] : [])];
    if (tasks.length) {
      cfg.modResults.BGTaskSchedulerPermittedIdentifiers = addAll(
        cfg.modResults.BGTaskSchedulerPermittedIdentifiers,
        tasks
      );
      cfg.modResults.UIBackgroundModes = addAll(cfg.modResults.UIBackgroundModes, ['fetch']);
    }
    return cfg;
  });

  if (offline) {
    config = withAndroidManifest(config, (cfg) => {
      for (const permission of OFFLINE_PERMISSIONS) {
        AndroidConfig.Permissions.addPermission(cfg.modResults, permission);
      }
      return cfg;
    });
  }
  return config;
}

module.exports = withArcGISToolkit;
