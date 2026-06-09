import { Map, MapView, setTokenCredential, signInWithOAuth, signOut } from 'expo-arcgis';
import { useState } from 'react';
import { Button, Linking } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

/**
 * Authentication entry points: a stored token login, an OAuth user sign-in, and sign-out.
 * OAuth needs a registered app's client id + redirect — the placeholders here are illustrative.
 */
export default function Authentication() {
  const [status, setStatus] = useState('Token, OAuth or sign-out.');

  function tokenLogin() {
    // Stored login; the challenge handler authenticates secured services as they load.
    setTokenCredential('viewer01', 'I68VGU^nMurF');
    setStatus('Token credential stored — secured services authenticate on load');
  }

  async function oauth() {
    setStatus('OAuth: signing in…');
    try {
      // The module has no browser dependency — the consumer opens the auth session. Here we use
      // React Native's Linking; a real app could use expo-web-browser / expo-auth-session.
      const openAuthSession = (authorizeUrl: string, redirectUrl: string) =>
        new Promise<string | null>((resolve) => {
          const subscription = Linking.addEventListener('url', ({ url }) => {
            if (url.startsWith(redirectUrl)) {
              subscription.remove();
              resolve(url);
            }
          });
          Linking.openURL(authorizeUrl);
        });
      await signInWithOAuth(
        'https://www.arcgis.com',
        'YOUR_CLIENT_ID',
        'expoarcgisexample://auth',
        openAuthSession
      );
      setStatus('OAuth sign-in ✅ — secured portal items now load');
    } catch (e) {
      setStatus(`OAuth error: ${String(e)}`);
    }
  }

  return (
    <SampleScreen
      status={status}
      controls={
        <>
          <Button title="Token login" onPress={tokenLogin} />
          <Button title="Sign in (OAuth)" onPress={oauth} />
          <Button title="Sign out" onPress={() => signOut()} />
        </>
      }
    >
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34, longitude: -118, scale: 30_000_000 }}>
        <MapView style={{ flex: 1 }} />
      </Map>
    </SampleScreen>
  );
}
