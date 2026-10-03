# expo-arcgis-toolkit

Components from the **ArcGIS Maps SDK Toolkits** ([Swift](https://github.com/Esri/arcgis-maps-sdk-swift-toolkit),
[Kotlin](https://github.com/Esri/arcgis-maps-sdk-kotlin-toolkit)) for [expo-arcgis](https://www.npmjs.com/package/expo-arcgis):
the native Toolkit views, driven by your `<Map>` / `<MapView>` and `<Scene>` / `<SceneView>`.

📖 **[Documentation & samples →](https://mapforge.dev)**

## Install

```sh
npx expo install expo-arcgis expo-arcgis-toolkit
```

It builds on expo-arcgis: set that up first (its config plugin, API key and requirements). Then
add this package's config plugin after it and rebuild the native app (`npx expo prebuild --clean`):

```json
{ "expo": { "plugins": ["expo-arcgis", "expo-arcgis-toolkit"] } }
```

The plugin adds what the components need from the app:
- the iOS camera and microphone usage descriptions, for the feature form's attachments and barcodes;
- for `OfflineMapAreas`, the iOS background task identifiers and background fetch, and the Android
  download permissions. On Android 13+, request the notification permission at runtime to see
  download progress.

To word the descriptions yourself, pass `{ "cameraUsageDescription": "…",
"microphoneUsageDescription": "…" }`; `false` leaves one out. `"offlineMapAreas": false` leaves out
what `OfflineMapAreas` needs. `"jobManager": true` permits the job manager's background task, which
`jobManager` needs.

`"ar": true` adds what the augmented reality views need: on iOS, the camera and location
descriptions; on Android, the camera and location permissions and ARCore's entry. ARCore is then
optional. `"ar": { "arcore": "required" }` makes it required, so Google Play shows the app on ARCore
devices only. `"arcoreApiKey"` sets the Google Cloud API key for the world-scale view's `geospatial`
tracking.

`"oAuthRedirectUris": ["my-app://auth"]` declares the Kotlin Toolkit's `AuthenticationActivity` for
these redirect URIs. On Android, `Authenticator`'s OAuth and IAP sign-ins need it: list each
configuration's `redirectUrl`. Give them a scheme of their own, not the app's `scheme`. iOS needs
nothing for them.

## Components

Components drawn over a view go **inside** its `<MapView>` or `<SceneView>`. Panels are views of
their own, which you lay out:
- A panel for a map, such as `BasemapGallery`, goes anywhere inside the `<Map>`.
- A panel for a view, such as `Bookmarks`, `Legend` or `Search`, goes inside its `<MapView>` /
  `<SceneView>`, over the map.
  It can also go anywhere else, with the view's ref as its `geoView`.

| Component | Kind | iOS | Android |
| --- | --- | --- | --- |
| `Compass` | over a map or scene view | ✓ | ✓ |
| `Scalebar` | over a map view | ✓ | ✓ |
| `OverviewMap` | over a map or scene view | ✓ | — |
| `LocationButton` | over a map view | ✓ | — |
| `FloorFilter` | over a map or scene view (floor-aware data) | ✓ | ✓ |
| `BasemapGallery` | panel for a map | ✓ | ✓ |
| `Bookmarks` | panel for a map or scene view | ✓ | — |
| `BuildingExplorer` | panel for a local scene view | ✓ | — |
| `Legend` | panel for a map or scene view | — | ✓ |
| `FeatureFormView` | panel (a feature from `identify`) | ✓ | ✓ |
| `OfflineMapAreas` | panel for a web map (`<Map portalItem>`) | ✓ | ✓ |
| `jobManager` | app-level: keeps long jobs across launches | ✓ | — |
| `Authenticator` | app-level: prompts for authentication challenges | ✓ | ✓ |
| `TableTopSceneView` | augmented reality scene view: the scene on a table | ✓ | ✓ |
| `FlyoverSceneView` | augmented reality scene view: fly over the scene | ✓ | ✓ |
| `WorldScaleSceneView` | augmented reality scene view: the scene in the world around you | ✓ | ✓ |
| `PopupView` | panel (a popup from `identifyPopups`) | ✓ | ✓ |
| `Search` | panel for a map or scene view | ✓ | — |
| `FloatingPanel` | panel with React content, floating over a map or scene view | ✓ | — |
| `UtilityNetworkTrace` | panel for a map view (utility networks) | ✓ | ✓ |

A component the Toolkit has on one platform only renders nothing on the other, and warns once in
development.

```tsx
import { Map, MapView } from 'expo-arcgis';
import { Compass, Scalebar } from 'expo-arcgis-toolkit';

export default function App() {
  return (
    <Map basemap="arcGISTopographic">
      <MapView style={{ flex: 1 }}>
        <Compass />
        <Scalebar units="metric" />
      </MapView>
    </Map>
  );
}
```

A panel bound to a view from outside it:

```tsx
import { Map, MapView, type MapViewHandle } from 'expo-arcgis';
import { Bookmarks } from 'expo-arcgis-toolkit';
import { useRef } from 'react';

export default function App() {
  const mapView = useRef<MapViewHandle>(null);
  return (
    <>
      <Map portalItem={{ itemId: '<web map id>' }}>
        <MapView ref={mapView} style={{ flex: 1 }} />
      </Map>
      <Bookmarks geoView={mapView} style={{ height: 240 }} />
    </>
  );
}
```

## Floating panel

`<FloatingPanel>` shows React content in the Toolkit's floating panel. Inside a `<MapView>` or
`<SceneView>`, it floats over the view, and touches outside the panel reach the map. In portrait it
rests at the bottom of the view, like a sheet; elsewhere it floats at the top, `horizontalAlignment`
and `maxWidth` wide. The user drags its handle between the `'summary'`, `'half'` and `'full'`
detents.

The panel decides the content's size, and React lays the content out in it: give the content
`flex: 1` to fill it.

```tsx
import { Map, MapView } from 'expo-arcgis';
import { FloatingPanel, type FloatingPanelDetent } from 'expo-arcgis-toolkit';

const [detent, setDetent] = useState<FloatingPanelDetent>('half');

<Map basemap="arcGISTopographic">
  <MapView style={{ flex: 1 }}>
    <FloatingPanel selectedDetent={detent} onSelectedDetentChange={setDetent}>
      <FlatList style={{ flex: 1 }} data={places} renderItem={renderPlace} />
    </FloatingPanel>
  </MapView>
</Map>
```

## Authenticator

`<Authenticator>` goes once at the root of the app. While it is mounted, it handles the
authentication challenges and shows the Toolkit's prompts:
- a username and password, for token-secured services and IWA servers;
- the portal's sign-in page in a browser, for a portal in `oAuthUserConfigurations`;
- the IAP sign-in, for a host in `iapConfigurations`;
- whether to trust an untrusted host, on iOS with `promptForUntrustedHosts`;
- which client certificate to use.

On iOS, App Transport Security rejects an untrusted host before the SDK can ask. Allow the host in
Info.plist first, for example in app.json:

```json
"ios": {
  "infoPlist": {
    "NSAppTransportSecurity": {
      "NSAllowsLocalNetworking": true,
      "NSExceptionDomains": {
        "my-server.example.com": { "NSExceptionAllowsInsecureHTTPLoads": true }
      }
    }
  }
}
```

`ios.infoPlist` replaces Expo's own `NSAppTransportSecurity` entry, so keep its
`NSAllowsLocalNetworking`: the development build loads its JavaScript from the local network.

```tsx
import { MapSettings, enablePersistentCredentialStore } from 'expo-arcgis';
import { Authenticator } from 'expo-arcgis-toolkit';

enablePersistentCredentialStore(); // keeps the sign-ins across launches

export default function RootLayout() {
  return (
    <MapSettings config={{ apiKey }}>
      <Stack />
      <Authenticator
        oAuthUserConfigurations={[
          { portalUrl: 'https://www.arcgis.com', clientId: '<client id>', redirectUrl: 'my-app://auth' },
        ]}
      />
    </MapSettings>
  );
}
```

It takes the place of expo-arcgis's challenge handlers and hands the challenges back when it
unmounts. While it is mounted, a login stored with `setTokenCredential` and
`setAllowUntrustedHosts` don't apply, unless `setAsArcGISAuthenticationChallengeHandler={false}` or
`setAsNetworkAuthenticationChallengeHandler={false}` leaves those challenges to them. Its ref's
`signOut()` is the Toolkit's sign-out: it revokes the OAuth tokens, signs out of the IAPs, and
clears the credential stores.

## Augmented reality

`TableTopSceneView`, `FlyoverSceneView` and `WorldScaleSceneView` are expo-arcgis's `<SceneView>`
shown in augmented reality: iOS uses ARKit, Android ARCore. Place one inside a `<Scene>`. Overlays go
inside it, and its events (`onTap`…) and ref (`identify`…) work as a scene view's do. The device's
movement controls the camera, so `camera` and `cameraController` don't apply.

For the camera feed to show through the scene, make the scene's surface transparent. Tabletop and
world-scale views also need a camera that can go below the surface:

```tsx
import { Scene, SceneLayer } from 'expo-arcgis';
import { TableTopSceneView } from 'expo-arcgis-toolkit';

<Scene surface={{ opacity: 0, navigationConstraint: 'unconstrained' }}>
  <SceneLayer url="<a 3D object scene service>" />
  <TableTopSceneView
    anchorPoint={{ latitude: 45.5326, longitude: -122.6835 }}
    translationFactor={1000}
    clippingDistance={400}
  />
</Scene>
```

AR needs a device: the iOS simulator has no ARKit, and an Android emulator has no ARCore unless
Google Play Services for AR is installed. The Android views report why they failed to initialize
(`onInitializationStatusChange`).

## License

MIT © Alexandr Krassavin. See [LICENSE](./LICENSE).
