import type { MapLoadErrorEventPayload } from '../ExpoArcgis.types';

/**
 * Stands in for an unset `onMapLoadError` / `onSceneLoadError`. Without it a failed load — a
 * rejected API key, an unreachable portal item, a service that is down — leaves an empty view and
 * nothing in the log: the iOS SDK doesn't log it at all. Development builds only; once the app
 * handles the event, reporting it is the app's call.
 */
export function unhandledLoadError(view: 'MapView' | 'SceneView', prop: string) {
  if (!__DEV__) return undefined;
  return ({ nativeEvent }: { nativeEvent: MapLoadErrorEventPayload }) => {
    console.warn(
      `[expo-arcgis] <${view}> failed to load: ${nativeEvent.message}\n` +
        `Handle ${prop} to show it in your UI; ref.retryLoad() tries again.`
    );
  };
}
