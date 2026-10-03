import type { ArInitializationStatus } from 'expo-arcgis-toolkit';

/** An AR view's initialization status (Android) as a line of text. */
export function describeStatus({ status, error }: ArInitializationStatus): string {
  switch (status) {
    case 'initializing':
      return 'AR is starting…';
    case 'detectingPlanes':
      return 'Move the device slowly to find a surface, then tap it.';
    case 'initialized':
      return 'AR is running.';
    case 'failedToInitialize':
      return `AR failed to start: ${error ?? 'unknown error'}`;
  }
}
