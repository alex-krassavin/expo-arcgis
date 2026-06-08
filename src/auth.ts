import { Platform } from 'react-native';

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

/**
 * Opens an OAuth authorization browser and resolves with the redirect URL the provider returns
 * (or `null` if the user cancelled). The consumer supplies this so the module stays free of any
 * browser dependency — e.g. with `expo-web-browser`:
 *
 * ```ts
 * import * as WebBrowser from 'expo-web-browser';
 * const openAuthSession = async (authorizeUrl, redirectUrl) => {
 *   const r = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
 *   return r.type === 'success' ? r.url : null;
 * };
 * ```
 */
export type OpenAuthSession = (authorizeUrl: string, redirectUrl: string) => Promise<string | null>;

/**
 * Signs the user in with OAuth 2.0 and caches the resulting credential, so secured portal items
 * (web maps / scenes from that portal) load afterwards. `redirectUrl` must match a redirect URI
 * registered on your OAuth app. On iOS the SDK presents the auth browser itself; on Android you
 * must pass `openAuthSession` (the module has no browser dependency — you bring your own).
 */
export async function signInWithOAuth(
  portalUrl: string,
  clientId: string,
  redirectUrl: string,
  openAuthSession?: OpenAuthSession
): Promise<void> {
  if (Platform.OS === 'ios') {
    await Module.signInWithOAuth(portalUrl, clientId, redirectUrl);
    return;
  }
  if (!openAuthSession) {
    throw new Error('signInWithOAuth on Android requires an openAuthSession callback to open the browser');
  }
  // Android: the SDK can't present a browser itself — the consumer opens it, we complete the flow.
  const authorizeUrl = await Module.oauthStart(portalUrl, clientId, redirectUrl);
  const redirect = await openAuthSession(authorizeUrl, redirectUrl);
  if (redirect) {
    await Module.oauthComplete(redirect);
  } else {
    throw new Error('OAuth sign-in was cancelled');
  }
}
