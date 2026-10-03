import { Platform } from 'react-native';

import Module from './ExpoArcgisModule';
import GeometryModule from './ExpoArcgisGeometryModule';
import ExtrasModule from './ExpoArcgisExtrasModule';

/**
 * Stores a login for token-secured services (e.g. a utility-network feature service). Uses the
 * recommended challenge-handler pattern: the SDK requests credentials when it actually hits a
 * secured resource, and a `TokenCredential` is minted for that exact resource — so there's no
 * service URL to match and no need to call this before the content loads. Call once after launch.
 *
 * `tokenExpirationMinutes` sets the lifetime of generated tokens; omit to use the server's default.
 */
export function setTokenCredential(
  username: string,
  password: string,
  tokenExpirationMinutes?: number
): void {
  Module.setTokenCredential(username, password, tokenExpirationMinutes ?? null);
}

/**
 * Installs (or removes) a network-layer handler that trusts **every** TLS server-trust challenge,
 * including self-signed and expired certificates.
 *
 * **For development and on-premises ArcGIS Enterprise only.** Disabling TLS certificate
 * validation makes all SDK network connections vulnerable to man-in-the-middle attacks — never
 * call this with `true` in a production app or against public-internet services.
 *
 * - `true`  → trust all server-trust challenges (bypass certificate validation).
 * - `false` → remove the override and restore normal TLS validation (the default).
 *
 * On iOS, App Transport Security rejects an untrusted host before this handler sees it. Allow the
 * host in Info.plist as well: `NSAppTransportSecurity` › `NSExceptionDomains` › the host ›
 * `NSExceptionAllowsInsecureHTTPLoads`.
 */
export function setAllowUntrustedHosts(allow: boolean): void {
  Module.setAllowUntrustedHosts(allow);
}

/**
 * Revokes the OAuth tokens, then clears the stored login and all cached credentials: the ArcGIS
 * ones (token, OAuth) and the network ones (logins to IWA servers, client certificates, trusted
 * hosts).
 */
export function signOut(): Promise<void> {
  return Module.signOut();
}

/**
 * Authenticates the app itself (client id + secret — no user login) against `portalUrl`, caching
 * an app token credential. Use for app-level access to secured services without a user sign-in.
 */
export function setAppCredential(
  portalUrl: string,
  clientId: string,
  clientSecret: string
): Promise<void> {
  return Module.setAppCredential(portalUrl, clientId, clientSecret);
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

/** When the iOS keychain lets the app read the credentials it keeps (the SDK's `KeychainAccess`). */
export type KeychainAccess =
  | 'afterFirstUnlock'
  | 'afterFirstUnlockThisDeviceOnly'
  | 'whenUnlocked'
  | 'whenUnlockedThisDeviceOnly'
  | 'whenPasscodeSetThisDeviceOnly';

/** Options of `enablePersistentCredentialStore`: the SDK's `makePersistent` parameters. */
export type PersistentCredentialStoreOptions = {
  /**
   * When the keychain lets the app read the credentials.
   * @default 'afterFirstUnlock'
   * @platform ios
   */
  access?: KeychainAccess;
  /**
   * Whether the keychain syncs the credentials with iCloud.
   * @default false
   * @platform ios
   */
  synchronizesWithiCloud?: boolean;
};

/**
 * Swaps the in-memory credential stores for **persistent** ones, kept in the platform's secure
 * storage (the iOS keychain, Android's encrypted storage). There are two:
 *
 * - the ArcGIS credential store: tokens and OAuth sign-ins;
 * - the network credential store: logins to IWA servers, client certificates and trusted hosts,
 *   which the toolkit's `<Authenticator>` adds.
 *
 * After this call, any credential added to them survives app restarts: via `setTokenCredential`,
 * `signInWithOAuth`, `setAppCredential`, the automatic challenge handler, or an `<Authenticator>`.
 * The Swift Toolkit's `setupPersistentCredentialStorage` does the same.
 *
 * Call once on app start, before any secured resource is loaded. Awaiting it ensures the swap
 * is complete before the SDK attempts to make any authenticated request.
 *
 * Registered on the geometry module (not the main module) to stay within the Android JVM 64 KB
 * method-size limit.
 */
export function enablePersistentCredentialStore(
  options?: PersistentCredentialStoreOptions
): Promise<void> {
  return GeometryModule.enablePersistentCredentialStore(options ?? null);
}

/**
 * Removes all credentials from both credential stores, persistent or in-memory: the ArcGIS ones
 * (token, OAuth) and the network ones (logins to IWA servers, client certificates, trusted hosts).
 * Persistent stores stay persistent, but empty. Call it when the user explicitly logs out and no
 * credential may be left on the device. The Swift Toolkit's `clearCredentialStores` does the same.
 *
 * Note: this does **not** revoke OAuth tokens on the server — it only removes them locally.
 *
 * Registered on the geometry module (not the main module) to stay within the Android JVM 64 KB
 * method-size limit.
 */
export function clearCredentialStore(): Promise<void> {
  return GeometryModule.clearCredentialStore();
}

/**
 * Pre-generates a `TokenCredential` for a **specific** service URL and adds it directly to the
 * credential store, so that service uses a dedicated login independently of any other challenge-
 * handler credential. Use this when different services require different logins.
 *
 * The token is minted eagerly (the call suspends until the server responds), then stored scoped
 * to `serviceUrl`. If a credential for that URL already exists in the store it is **replaced**
 * (the SDK's `add(for:)` / `add(credential, url)` overload updates the entry for that origin).
 *
 * `tokenExpirationMinutes` is optional; the server's default expiry is used when omitted.
 *
 * Registered on the extras module to stay within the Android JVM 64 KB method-size limit.
 */
export function setServiceCredential(
  serviceUrl: string,
  username: string,
  password: string,
  tokenExpirationMinutes?: number
): Promise<void> {
  return ExtrasModule.setServiceCredential(serviceUrl, username, password, tokenExpirationMinutes ?? null);
}
