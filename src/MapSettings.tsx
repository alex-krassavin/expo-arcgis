import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';

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

/** Global ArcGIS settings (mirrors `esriConfig`). Currently applies the API key. */
export function MapSettings({ config, children }: PropsWithChildren<MapSettingsProps>) {
  useEffect(() => {
    if (config?.apiKey) {
      ExpoArcgisModule.setApiKey(config.apiKey);
    }
  }, [config?.apiKey]);

  return <MapSettingsContext.Provider value={config}>{children}</MapSettingsContext.Provider>;
}
