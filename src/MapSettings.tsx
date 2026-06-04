import { createContext, useContext, useRef, type PropsWithChildren } from 'react';

import ExpoArcgisModule from './ExpoArcgisModule';

export type MapSettingsConfig = {
  /** ArcGIS API key. Equivalent to passing `apiKey` to the config plugin, but at runtime. */
  apiKey?: string;
};

type MapSettingsProps = {
  config?: MapSettingsConfig;
};

const MapSettingsContext = createContext<MapSettingsConfig | undefined>(undefined);

export function useMapSettings(): MapSettingsConfig | undefined {
  return useContext(MapSettingsContext);
}

/**
 * Global ArcGIS settings (mirrors `esriConfig`). Applies the API key **synchronously during render**,
 * before any descendant `<Map>` / `<MapView>` (and the native map load) mount — so the very first
 * map load already sees the key. Guarded by value so it only re-applies when the key changes.
 */
export function MapSettings({ config, children }: PropsWithChildren<MapSettingsProps>) {
  const appliedKey = useRef<string | undefined>(undefined);
  if (config?.apiKey && config.apiKey !== appliedKey.current) {
    appliedKey.current = config.apiKey;
    ExpoArcgisModule.setApiKey(config.apiKey);
  }

  return <MapSettingsContext.Provider value={config}>{children}</MapSettingsContext.Provider>;
}
