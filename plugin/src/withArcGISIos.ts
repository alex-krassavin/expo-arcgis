import { ConfigPlugin, withInfoPlist, withPodfileProperties } from 'expo/config-plugins';

import { ArcGISPluginProps } from './types';

/** ArcGIS Maps SDK for Swift 300.0 requires iOS 17.0+. */
const REQUIRED_IOS_DEPLOYMENT_TARGET = '17.0';

export const withArcGISIos: ConfigPlugin<ArcGISPluginProps> = (config, props) => {
  config = withArcGISDeploymentTarget(
    config,
    props.iosDeploymentTarget ?? REQUIRED_IOS_DEPLOYMENT_TARGET
  );

  if (props.apiKey) {
    config = withArcGISApiKeyInfoPlist(config, props.apiKey);
  }

  if (props.locationWhenInUseUsageDescription) {
    config = withLocationUsageDescription(config, props.locationWhenInUseUsageDescription);
  }

  return config;
};

/** Raises the iOS deployment target in Podfile.properties.json (never lowers it). */
const withArcGISDeploymentTarget: ConfigPlugin<string> = (config, target) =>
  withPodfileProperties(config, (cfg) => {
    const current = cfg.modResults['ios.deploymentTarget'];
    if (!current || parseFloat(current) < parseFloat(target)) {
      cfg.modResults['ios.deploymentTarget'] = target;
    }
    return cfg;
  });

/** Stores the API key in Info.plist as `ArcGISAPIKey` for the native runtime to read. */
const withArcGISApiKeyInfoPlist: ConfigPlugin<string> = (config, apiKey) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.ArcGISAPIKey = apiKey;
    return cfg;
  });

const withLocationUsageDescription: ConfigPlugin<string> = (config, description) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationWhenInUseUsageDescription =
      cfg.modResults.NSLocationWhenInUseUsageDescription ?? description;
    return cfg;
  });
