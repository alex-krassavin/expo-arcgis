import Module from './ExpoArcgisModule';

/**
 * Stores a login for token-secured services (e.g. a utility-network feature service). Uses the
 * recommended challenge-handler pattern: the SDK requests credentials when it actually hits a
 * secured resource, and a `TokenCredential` is minted for that exact resource — so there's no
 * service URL to match and no need to call this before the content loads. Call once after launch.
 */
export function setTokenCredential(username: string, password: string): void {
  Module.setTokenCredential(username, password);
}

/** Clears the stored login and all cached credentials (token + OAuth). */
export function signOut(): Promise<void> {
  return Module.signOut();
}
