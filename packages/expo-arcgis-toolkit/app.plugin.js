// Config plugin for expo-arcgis-toolkit: what the toolkit's components need from the app.
// List it in app.json (`"plugins": ["expo-arcgis", "expo-arcgis-toolkit"]`), then rebuild the app.
const { withInfoPlist } = require('expo/config-plugins');

/**
 * iOS Info.plist usage descriptions for the feature form's attachments and barcode scanner, which
 * use the camera (and the microphone for video). Entries the app already has are kept. Pass `false`
 * to leave one out.
 *
 * @param {import('expo/config').ExpoConfig} config
 * @param {{
 *   cameraUsageDescription?: string | false,
 *   microphoneUsageDescription?: string | false,
 * }} [props]
 */
function withArcGISToolkit(config, props = {}) {
  const camera =
    props.cameraUsageDescription ??
    'Allow $(PRODUCT_NAME) to use the camera for feature attachments and barcodes.';
  const microphone =
    props.microphoneUsageDescription ??
    'Allow $(PRODUCT_NAME) to record audio for video attachments.';
  return withInfoPlist(config, (cfg) => {
    if (camera !== false) {
      cfg.modResults.NSCameraUsageDescription = cfg.modResults.NSCameraUsageDescription ?? camera;
    }
    if (microphone !== false) {
      cfg.modResults.NSMicrophoneUsageDescription =
        cfg.modResults.NSMicrophoneUsageDescription ?? microphone;
    }
    return cfg;
  });
}

module.exports = withArcGISToolkit;
