---
title: Toolkit
description: The ArcGIS Maps SDK Toolkits' components for expo-arcgis — compass, search, popups, forms, offline areas, sign-in, augmented reality and more.
---

`expo-arcgis-toolkit` brings the components of the ArcGIS Maps SDK Toolkits
([Swift](https://github.com/Esri/arcgis-maps-sdk-swift-toolkit),
[Kotlin](https://github.com/Esri/arcgis-maps-sdk-kotlin-toolkit)) to expo-arcgis. Each component
is the Toolkit's own native view, driven by your `<Map>` / `<MapView>` and `<Scene>` /
`<SceneView>`. The look and the behavior are Esri's, and the props are the Toolkit's settings, with
its names and defaults.

## Install

```sh
npx expo install expo-arcgis expo-arcgis-toolkit
```

It builds on expo-arcgis: set that up first ([Getting started](/guides/getting-started/)).
Then add this package's config plugin after expo-arcgis's, and regenerate the native projects:

```js
// app.config.js
module.exports = {
  expo: {
    plugins: [['expo-arcgis', { apiKey: process.env.ARCGIS_API_KEY }], 'expo-arcgis-toolkit'],
  },
};
```

```sh
npx expo prebuild --clean
```

### Config plugin options

By default, the plugin adds:
- the iOS camera and microphone descriptions, for the feature form's attachments and barcodes;
- for `OfflineMapAreas`, the iOS background task identifiers and background fetch, and the Android
  download permissions. On Android 13+, request the notification permission at runtime to see the
  download progress.

| Option | What it does |
|---|---|
| `cameraUsageDescription`, `microphoneUsageDescription` | Your own wording for the descriptions; `false` leaves one out. |
| `offlineMapAreas: false` | Leaves out what `OfflineMapAreas` needs. |
| `jobManager: true` | Permits the background task of the job manager (`jobManager`, iOS). |
| `oAuthRedirectUris: ['my-app://auth']` | Declares the Kotlin Toolkit's `AuthenticationActivity` for these redirect URIs. `Authenticator`'s OAuth and IAP sign-ins need it on Android. Give them a scheme of their own, not the app's `scheme`. |
| `ar: true` | What the augmented reality views need. On iOS, that is the camera and location descriptions. On Android, it is the camera and location permissions, plus ARCore's entry. |
| `ar: { arcore: 'required' }` | Makes ARCore required, so Google Play shows the app on ARCore devices only. It is optional by default. |
| `ar: { arcoreApiKey }` | The Google Cloud API key for the world-scale view's `geospatial` tracking. |

## Components

| Component | Kind | iOS | Android | Sample |
|---|---|:-:|:-:|---|
| `Compass` | over a map or scene view | ✓ | ✓ | [Compass and scalebar](/samples/toolkit-compass-scalebar/), [Scene accessories](/samples/toolkit-scene-accessories/) |
| `Scalebar` | over a map view | ✓ | ✓ | [Compass and scalebar](/samples/toolkit-compass-scalebar/) |
| `OverviewMap` | over a map or scene view | ✓ | — | [Overview map](/samples/toolkit-overview-map/) |
| `LocationButton` | over a map view | ✓ | — | [Location button](/samples/toolkit-location-button/) |
| `FloorFilter` | over a map or scene view (floor-aware data) | ✓ | ✓ | [Floor filter](/samples/toolkit-floor-filter/) |
| `BasemapGallery` | panel for a map | ✓ | ✓ | [Basemap gallery](/samples/toolkit-basemap-gallery/) |
| `Bookmarks` | panel for a map or scene view | ✓ | — | [Bookmarks](/samples/toolkit-bookmarks/) |
| `Legend` | panel for a map or scene view | — | ✓ | [Legend](/samples/toolkit-legend/) |
| `Search` | panel for a map or scene view | ✓ | — | [Search](/samples/toolkit-search/) |
| `FloatingPanel` | panel with React content, floating over a map or scene view | ✓ | — | [Floating panel](/samples/toolkit-floating-panel/) |
| `BuildingExplorer` | panel for a local scene view | ✓ | — | [Building explorer](/samples/toolkit-building-explorer/) |
| `UtilityNetworkTrace` | panel for a map view (utility networks) | ✓ | ✓ | [Utility network trace](/samples/toolkit-utility-network-trace/) |
| `PopupView` | panel (a popup from `identifyPopups`) | ✓ | ✓ | [Popup](/samples/toolkit-popup/) |
| `FeatureFormView` | panel (a feature from `identify`) | ✓ | ✓ | [Feature form](/samples/toolkit-feature-form/) |
| `OfflineMapAreas` | panel for a web map (`<Map portalItem>`) | ✓ | ✓ | [Offline map areas](/samples/toolkit-offline-map-areas/) |
| `jobManager` | app-level: keeps long jobs across launches | ✓ | — | [Job manager](/samples/toolkit-job-manager/) |
| `Authenticator` | app-level: prompts for authentication challenges | ✓ | ✓ | [Authenticator](/samples/toolkit-authenticator/) |
| `TableTopSceneView` | augmented reality: the scene on a table | ✓ | ✓ | [AR tabletop](/samples/toolkit-ar-tabletop/) |
| `FlyoverSceneView` | augmented reality: fly over the scene | ✓ | ✓ | [AR flyover](/samples/toolkit-ar-flyover/) |
| `WorldScaleSceneView` | augmented reality: the scene in the world around you | ✓ | ✓ | [AR world scale](/samples/toolkit-ar-world-scale/) |

A component that the Toolkit has on one platform only renders nothing on the other platform, and
warns once in development. An API that one platform lacks does nothing there.

Every component, prop and type is in the [Toolkit API reference](/api-toolkit/readme/).

## Where components go

**Over a view.** `Compass`, `Scalebar`, `OverviewMap`, `LocationButton` and `FloorFilter` go
inside the `<MapView>` or `<SceneView>`. The view draws them over the map at their `alignment`,
keeping its `contentInsets` clear.

**Panels** are views of their own, which you lay out:
- A panel for a map, such as `BasemapGallery`, goes anywhere inside the `<Map>`.
- A panel for a view, such as `Bookmarks`, `Legend`, `Search`, `BuildingExplorer` or
  `UtilityNetworkTrace`, goes inside its `<MapView>` / `<SceneView>`, over the map. It can also go
  anywhere else, with the view's ref as its `geoView`.
- `PopupView` and `FeatureFormView` show what `identifyPopups` and `identify` found: pass the
  result's `ref`.

```tsx
import { Map, MapView, type MapViewHandle } from 'expo-arcgis';
import { Bookmarks, Compass, Scalebar } from 'expo-arcgis-toolkit';
import { useRef } from 'react';

export default function App() {
  const mapView = useRef<MapViewHandle>(null);
  return (
    <>
      <Map portalItem={{ itemId: '<web map id>' }}>
        <MapView ref={mapView} style={{ flex: 1 }}>
          <Compass />
          <Scalebar units="metric" />
        </MapView>
      </Map>
      {/* Outside the view: bound to it by its ref. */}
      <Bookmarks geoView={mapView} style={{ height: 240 }} />
    </>
  );
}
```

## Floating panel

`<FloatingPanel>` shows your React content in the Toolkit's floating panel (iOS). Inside a
`<MapView>` or `<SceneView>`, it floats over the view, and touches outside the panel reach the map.

The layout depends on the size class:
- In portrait, it rests at the bottom of the view, like a sheet.
- Elsewhere, it floats at the top, placed by `horizontalAlignment` and at most `maxWidth` wide.

The user drags its handle between the `'summary'`, `'half'` and `'full'` detents. The panel decides
the content's size, and React lays the content out in it: give the content `flex: 1` to fill it.

```tsx
const [detent, setDetent] = useState<FloatingPanelDetent>('half');

<MapView style={{ flex: 1 }}>
  <FloatingPanel selectedDetent={detent} onSelectedDetentChange={setDetent}>
    <FlatList style={{ flex: 1 }} data={places} renderItem={renderPlace} />
  </FloatingPanel>
</MapView>
```

## Authenticator

`<Authenticator>` goes once at the root of the app. While it is mounted, it handles the
authentication challenges and shows the Toolkit's prompts:
- a username and password, for token-secured services and IWA servers;
- the portal's sign-in page, for a portal in `oAuthUserConfigurations`;
- the IAP sign-in, for a host in `iapConfigurations`;
- whether to trust an untrusted host, on iOS with `promptForUntrustedHosts`;
- which client certificate to use.

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

It takes the place of expo-arcgis's challenge handlers, and it hands the challenges back when it
unmounts. Its ref's `signOut()` is the Toolkit's sign-out: it revokes the OAuth tokens, signs out
of the IAPs and clears the credential stores.

On iOS, App Transport Security rejects an untrusted host before the SDK can ask. Allow the host in
Info.plist first (`NSAppTransportSecurity › NSExceptionDomains`), and keep Expo's
`NSAllowsLocalNetworking`: the development build loads its JavaScript from the local network.

## Augmented reality

`TableTopSceneView`, `FlyoverSceneView` and `WorldScaleSceneView` are expo-arcgis's `<SceneView>`
shown in augmented reality: iOS uses ARKit, Android ARCore.
- Place one inside a `<Scene>`.
- Overlays go inside it, and its events (`onTap`…) and ref (`identify`…) work as a scene view's do.
- The device's movement controls the camera, so `camera` and `cameraController` don't apply.

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
