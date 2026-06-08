import Module from './ExpoArcgisModule';

/**
 * Acquires an ArcGIS token credential for a secured service (username/password → token) and
 * registers it in the credential store, so subsequent requests to that service authenticate.
 * Use for services that require a login rather than just an API key — e.g. a utility-network
 * feature service. Call once before loading the secured content.
 */
export function setTokenCredential(
  serviceUrl: string,
  username: string,
  password: string
): Promise<void> {
  return Module.setTokenCredential(serviceUrl, username, password);
}
