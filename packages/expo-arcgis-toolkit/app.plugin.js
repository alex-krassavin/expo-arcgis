// Config plugin for expo-arcgis-toolkit: what the toolkit's components need from the app.
// List it in app.json (`"plugins": ["expo-arcgis", "expo-arcgis-toolkit"]`), then rebuild the app.
const {
  AndroidConfig,
  WarningAggregator,
  withAndroidManifest,
  withInfoPlist,
} = require('expo/config-plugins');

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

// The Kotlin Toolkit's activity that opens OAuth and IAP sign-ins (Authenticator) in a Custom Tab,
// and receives their redirects. Its manifest entry is the one the Toolkit documents.
const AUTHENTICATION_ACTIVITY = 'com.arcgismaps.toolkit.authentication.AuthenticationActivity';

/** Adds the values missing from an array entry of a plist or manifest. */
function addAll(list, values) {
  const result = Array.isArray(list) ? [...list] : [];
  for (const value of values) if (!result.includes(value)) result.push(value);
  return result;
}

/** The `<data>` of a redirect URI's intent filter: `my-app://auth` is scheme `my-app`, host `auth`. */
function redirectData(uri) {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/.exec(uri);
  if (!match) {
    throw new Error(
      `expo-arcgis-toolkit: "${uri}" in oAuthRedirectUris is not a redirect URI like my-app://auth. ` +
        '(An OAuth configuration with urn:ietf:wg:oauth:2.0:oob signs in in a web view, without it.)'
    );
  }
  const [, scheme, host, path] = match;
  const data = { 'android:scheme': scheme };
  if (host) data['android:host'] = host;
  if (path && path !== '/') data['android:path'] = path;
  return data;
}

/**
 * Declares the Kotlin Toolkit's AuthenticationActivity with an intent filter for each redirect URI,
 * as its documentation does. An activity entry the app already has keeps its filters.
 */
function addAuthenticationActivity(manifest, redirectUris) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application.activity = application.activity ?? [];
  let activity = application.activity.find((a) => a.$['android:name'] === AUTHENTICATION_ACTIVITY);
  if (!activity) {
    activity = {
      $: {
        'android:name': AUTHENTICATION_ACTIVITY,
        'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize',
        'android:exported': 'true',
        'android:launchMode': 'singleTop',
      },
    };
    application.activity.push(activity);
  }
  activity['intent-filter'] = activity['intent-filter'] ?? [];
  for (const uri of redirectUris) {
    const data = redirectData(uri);
    const key = JSON.stringify(data);
    const present = activity['intent-filter'].some((filter) =>
      (filter.data ?? []).some((entry) => JSON.stringify(entry.$) === key)
    );
    if (present) continue;
    activity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [{ $: data }],
    });
  }
}

/**
 * - iOS: usage descriptions for the feature form's camera and microphone (attachments, barcodes);
 *   and, for OfflineMapAreas, the offline manager's background task and background fetch.
 * - Android: OfflineMapAreas' download permissions.
 * - With `jobManager: true` (iOS), the shared job manager's background task and background fetch.
 * - With `oAuthRedirectUris` (Android), the Toolkit's AuthenticationActivity, which receives the
 *   redirects of the Authenticator's OAuth and IAP sign-ins. List the `redirectUrl` of each
 *   `oAuthUserConfigurations` and `iapConfigurations` entry. iOS needs nothing for them.
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
 *   oAuthRedirectUris?: string[],
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

  const redirectUris = props.oAuthRedirectUris ?? [];
  if (redirectUris.length) {
    // The app's own scheme opens its main activity: a redirect with it would open either one.
    const appSchemes = [config.scheme ?? []].flat();
    for (const uri of redirectUris) {
      const scheme = redirectData(uri)['android:scheme'];
      if (appSchemes.includes(scheme)) {
        WarningAggregator.addWarningAndroid(
          'expo-arcgis-toolkit',
          `The redirect URI ${uri} uses the app's scheme "${scheme}", which its main activity opens ` +
            'too: Android would ask which one opens the redirect. Give sign-in redirects a scheme of ' +
            'their own.'
        );
      }
    }
    config = withAndroidManifest(config, (cfg) => {
      addAuthenticationActivity(cfg.modResults, redirectUris);
      return cfg;
    });
  }
  return config;
}

module.exports = withArcGISToolkit;
