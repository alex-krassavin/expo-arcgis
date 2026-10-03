import { requireNativeView } from 'expo';
import { forwardRef, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet } from 'react-native';

import { availableOn } from './availableOn';

/**
 * An OAuth app that users sign in to a portal with (the SDK's `OAuthUserConfiguration`). When a
 * secured resource of the portal challenges, the authenticator opens the portal's sign-in page in
 * a browser instead of asking for a username and password.
 */
export type OAuthUserConfiguration = {
  /** The portal to sign in to, e.g. `https://www.arcgis.com`. */
  portalUrl: string;
  /** The client ID of the OAuth app registered on the portal. */
  clientId: string;
  /**
   * A redirect URL registered on the OAuth app, e.g. `my-app://auth`. On Android, list it in the
   * expo-arcgis-toolkit config plugin's `oAuthRedirectUris` as well.
   */
  redirectUrl: string;
  /**
   * How long the refresh token stays valid: the portal's default, the longest it allows, or a
   * number of minutes.
   * @default 'default'
   */
  refreshTokenExpirationInterval?: 'default' | 'maximum' | { minutes: number };
  /**
   * How often the refresh token is exchanged for a new one.
   * @default { minutes: 1440 }
   */
  refreshTokenExchangeInterval?: 'never' | { minutes: number };
  /**
   * How long tokens for the portal's federated servers stay valid, in minutes; the server's default
   * when unset. The Kotlin SDK's `federatedTokenExpirationInterval`.
   */
  federatedTokenExpirationMinutes?: number;
  /**
   * Whether the sign-in page shows a cancel button.
   * @default true
   */
  showCancelButton?: boolean;
  /**
   * The sign-in page's appearance.
   * @default 'unspecified'
   */
  userInterfaceStyle?: 'unspecified' | 'light' | 'dark';
  /**
   * Whether the browser keeps the sign-in private: it shares no cookies with other browsing. The
   * Kotlin SDK's `preferPrivateWebBrowserSession`.
   * @default false
   */
  prefersPrivateWebBrowserSession?: boolean;
};

/** The prompt an IAP sign-in shows (the SDK's `IAPAuthorizationPromptType`). */
export type IapAuthorizationPromptType = 'noPrompt' | 'login' | 'consent' | 'selectAccount';

/**
 * An Identity-Aware Proxy (IAP) that users sign in through: ArcGIS Enterprise behind a proxy such
 * as Microsoft Entra application proxy. Either the identity provider's endpoints (the SDK's
 * `IAPConfiguration.configuration(...)`, Kotlin `IapConfiguration.create(...)`), or a Microsoft
 * Entra tenant (`IAPConfiguration.microsoft(...)`, Kotlin `IapConfiguration.createForMicrosoft(...)`).
 * On Android, list its redirect URL in the config plugin's `oAuthRedirectUris`.
 */
export type IapConfiguration =
  | {
      authorizeUrl: string;
      tokenUrl: string;
      logoutUrl: string;
      clientId: string;
      redirectUrl: string;
      scopes: string[];
      /** The hosts behind the proxy, which this configuration signs in to. */
      hostsBehindProxy: string[];
      authorizationPromptType?: IapAuthorizationPromptType;
      clientSecret?: string;
      iapClientId?: string;
    }
  | {
      /** The Microsoft Entra tenant. */
      tenantId: string;
      clientId: string;
      redirectUrl: string;
      /** The hosts behind the proxy, which this configuration signs in to. */
      hostsBehindProxy: string[];
      authorizationPromptType?: IapAuthorizationPromptType;
    };

export type AuthenticatorProps = {
  /**
   * The OAuth apps to sign in with: a challenge from a portal with one signs in with OAuth, any
   * other with a username and password.
   */
  oAuthUserConfigurations?: OAuthUserConfiguration[];
  /** The Identity-Aware Proxies to sign in through. */
  iapConfigurations?: IapConfiguration[];
  /**
   * Whether it asks the user to trust a host whose certificate isn't trusted (self-signed,
   * expired…). Otherwise, the host's requests fail as they do without an authenticator.
   *
   * iOS's App Transport Security rejects such a host before the SDK can ask. Allow the host in the
   * app's Info.plist first: `NSAppTransportSecurity` › `NSExceptionDomains` › the host ›
   * `NSExceptionAllowsInsecureHTTPLoads`, e.g. through `ios.infoPlist` in app.json.
   * @default false
   * @platform ios — the Kotlin Toolkit always asks.
   */
  promptForUntrustedHosts?: boolean;
  /**
   * Whether it handles the ArcGIS challenges: token, OAuth and IAP sign-ins. Otherwise,
   * expo-arcgis's handler keeps them (a login stored with `setTokenCredential`).
   * @default true
   */
  setAsArcGISAuthenticationChallengeHandler?: boolean;
  /**
   * Whether it handles the network challenges: logins to IWA servers, client certificates and
   * untrusted hosts. Otherwise, the handler before it keeps them (`setAllowUntrustedHosts`).
   * @default true
   */
  setAsNetworkAuthenticationChallengeHandler?: boolean;
};

/** What `<Authenticator>`'s ref does. */
export type AuthenticatorHandle = {
  /**
   * Signs the user out, as the Toolkit's sign-out does:
   * - revokes the OAuth tokens;
   * - signs out of the IAPs (in a browser on Android);
   * - clears both credential stores.
   */
  signOut(): Promise<void>;
  /**
   * Dismisses the prompts it shows, cancelling their challenges.
   * @platform android — the Swift Toolkit has no such call.
   */
  dismissAll(): Promise<void>;
};

type NativeAuthenticatorProps = AuthenticatorProps & {
  style?: unknown;
  pointerEvents?: 'none';
  /** The native view, whose async functions are callable through it. */
  ref?: Ref<NativeAuthenticator>;
};

type NativeAuthenticator = {
  signOut(): Promise<void>;
  dismissAll(): Promise<void>;
};

const NativeAuthenticator = requireNativeView<NativeAuthenticatorProps>(
  'ExpoArcgisToolkit',
  'AuthenticatorView'
);

/**
 * The ArcGIS Toolkit's authenticator. While it is mounted, it handles the app's authentication
 * challenges and shows the Toolkit's prompts:
 * - a username and password, for token-secured services and IWA servers;
 * - the portal's sign-in page in a browser, for a portal in `oAuthUserConfigurations`;
 * - the IAP sign-in, for a host in `iapConfigurations`;
 * - whether to trust a host whose certificate isn't trusted;
 * - which client certificate to use.
 *
 * Mount one, at the root of the app. It shows nothing until a challenge comes.
 *
 * It takes the place of expo-arcgis's challenge handlers, and hands the challenges back when it
 * unmounts. While it is mounted, a login stored with `setTokenCredential` and
 * `setAllowUntrustedHosts` don't apply, unless the `setAs…ChallengeHandler` props leave those
 * challenges to them. Credentials added with `signInWithOAuth`, `setAppCredential` or
 * `setServiceCredential` keep working.
 *
 * To keep sign-ins across launches, call expo-arcgis's `enablePersistentCredentialStore()` at
 * startup. On Android, OAuth and IAP sign-ins need their redirect URLs in the config plugin's
 * `oAuthRedirectUris`.
 *
 * ```tsx
 * <MapSettings config={{ apiKey }}>
 *   <Stack />
 *   <Authenticator
 *     oAuthUserConfigurations={[
 *       { portalUrl: 'https://www.arcgis.com', clientId: '<client id>', redirectUrl: 'my-app://auth' },
 *     ]}
 *   />
 * </MapSettings>
 * ```
 */
export const Authenticator = forwardRef<AuthenticatorHandle, AuthenticatorProps>(
  function Authenticator(props, handle) {
    const nativeRef = useRef<NativeAuthenticator>(null);
    useImperativeHandle(
      handle,
      () => ({
        signOut: async () => nativeRef.current?.signOut(),
        dismissAll: async () => {
          if (availableOn('android', 'dismissAll')) await nativeRef.current?.dismissAll();
        },
      }),
      []
    );
    return (
      <NativeAuthenticator {...props} ref={nativeRef} style={styles.hidden} pointerEvents="none" />
    );
  }
);

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 0, height: 0 },
});
