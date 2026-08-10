export type ArcGISPluginProps = {
  /**
   * ArcGIS API key (access token) used by the native runtime to authenticate with
   * ArcGIS location services. Typically supplied from an environment variable in
   * app.config.js, e.g. `apiKey: process.env.ARCGIS_API_KEY`.
   *
   * When provided it is written to a native resource (Android `strings.xml` →
   * `arcgis_api_key`, iOS `Info.plist` → `ArcGISAPIKey`) for the module to read at init.
   */
  apiKey?: string;

  /** Esri Maven repository URL (Android). Defaults to Esri's public artifactory. */
  androidMavenUrl?: string;

  /**
   * Minimum Android SDK level. ArcGIS Maps SDK 300.1 requires >= 28, but API 28 is
   * deprecated by Esri — 300.1 is the last release supporting it, and the next release
   * raises the floor to API 29.
   */
  androidMinSdkVersion?: number;

  /** Android compileSdk level. ArcGIS Maps SDK 300.1 requires >= 36. */
  androidCompileSdkVersion?: number;

  /** Minimum iOS deployment target. ArcGIS Maps SDK 300.1 requires >= 18.0. */
  iosDeploymentTarget?: string;

  /**
   * When set, adds ACCESS_FINE/COARSE_LOCATION (Android) and the matching iOS usage
   * description so the map can display the device location. Pass the iOS usage string;
   * omit to skip location permissions entirely.
   */
  locationWhenInUseUsageDescription?: string;
};
