import { createContext, useContext, useRef, type PropsWithChildren } from 'react';

import ExpoArcgisModule from './ExpoArcgisModule';

export type MapSettingsConfig = {
  /** ArcGIS API key. Equivalent to passing `apiKey` to the config plugin, but at runtime. */
  apiKey?: string;
  /**
   * ArcGIS deployment license string. Removes the "Licensed for Developer Use Only" watermark.
   * Separate from `apiKey`: the key authenticates services, the license unlocks deployment.
   */
  license?: string;
};

type MapSettingsProps = {
  config?: MapSettingsConfig;
};

const MapSettingsContext = createContext<MapSettingsConfig | undefined>(undefined);

export function useMapSettings(): MapSettingsConfig | undefined {
  return useContext(MapSettingsContext);
}

/**
 * Global ArcGIS settings (mirrors `esriConfig`). Applies the API key and license **synchronously
 * during render**, before any descendant `<Map>` / `<MapView>` (and the native map load) mount — so
 * the very first map load already sees them. Guarded by value so each only re-applies when it changes.
 */
export function MapSettings({ config, children }: PropsWithChildren<MapSettingsProps>) {
  const appliedKey = useRef<string | undefined>(undefined);
  if (config?.apiKey && config.apiKey !== appliedKey.current) {
    appliedKey.current = config.apiKey;
    ExpoArcgisModule.setApiKey(config.apiKey);
  }

  const appliedLicense = useRef<string | undefined>(undefined);
  if (config?.license && config.license !== appliedLicense.current) {
    appliedLicense.current = config.license;
    ExpoArcgisModule.setLicense(config.license);
  }

  return <MapSettingsContext.Provider value={config}>{children}</MapSettingsContext.Provider>;
}
