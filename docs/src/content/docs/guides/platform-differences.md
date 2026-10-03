---
title: Platform differences
description: What the ArcGIS Maps SDKs and Toolkits have on one platform only, and how expo-arcgis and expo-arcgis-toolkit handle it.
seoTitle: "iOS and Android differences · expo-arcgis"
---

The API is the same on iOS and Android. Where the native SDKs or Toolkits differ, it follows each
platform's own, and it doesn't make up what a platform lacks:
- A component that one platform's Toolkit doesn't have renders nothing on the other platform, and
  warns once in development.
- A setting that one platform doesn't have does nothing on the other.
- The [API reference](/api/readme/) and the [Toolkit API reference](/api-toolkit/readme/) mark each
  of them with **Platform**.

To show something else on the platform that lacks a component, branch on `Platform.OS`.

## Toolkit components

| Component | iOS | Android |
|---|:-:|:-:|
| `Compass`, `Scalebar`, `FloorFilter`, `BasemapGallery` | ✓ | ✓ |
| `PopupView`, `FeatureFormView`, `UtilityNetworkTrace`, `OfflineMapAreas` | ✓ | ✓ |
| `Authenticator` | ✓ | ✓ |
| `TableTopSceneView`, `FlyoverSceneView`, `WorldScaleSceneView` | ✓ | ✓ |
| `OverviewMap`, `LocationButton`, `Bookmarks`, `Search`, `BuildingExplorer`, `FloatingPanel` | ✓ | — |
| `jobManager` (its functions do nothing on Android) | ✓ | — |
| `Legend` | — | ✓ |

## Settings that differ

The Toolkits configure some components differently. Each setting keeps its own platform's name.

| Component | iOS only | Android only |
|---|---|---|
| `FloorFilter` | `automaticSelectionMode`, `automaticSingleSiteSelectionDisabled`, `levelSelectorWidth` | `uiProperties` (colors, button size, which buttons show) |
| `FeatureFormView` | `editingButtons` | `showFormActions`, `showCloseIcon` |
| `PopupView` | — | `showCloseIcon` |
| `Authenticator` | `promptForUntrustedHosts` (the Kotlin Toolkit always asks) | `dismissAll()` on its ref |
| `TableTopSceneView` | `coachingOverlayHidden` | `requestCameraPermissionAutomatically`, `onInitializationStatusChange` |
| `FlyoverSceneView` | — | `onInitializationStatusChange` |
| `WorldScaleSceneView` | `trackingMode`, `calibrationViewHidden`, `calibrationButtonAlignment`, `onCalibratingChange` | `worldScaleTrackingMode`, `onInitializationStatusChange`, `onTrackingErrorChange` |

The Swift Toolkit's AR views report no initialization status, so `onInitializationStatusChange` is
Android's.

## In expo-arcgis

| API | iOS only | Android only |
|---|---|---|
| `<Callout>` | — | `leaderPosition`, `colors`, `shapes`: the Kotlin Toolkit's callout styling. The Swift SDK's callout has the system's look, and places its leader itself. |
| `enablePersistentCredentialStore` | `access`, `synchronizesWithiCloud`: the keychain's options | — |

## Setting up the app

- **iOS: App Transport Security.** ATS rejects an untrusted host before the SDK can ask about it. To
  trust a host (`setAllowUntrustedHosts`, or the Authenticator's prompt), allow it in Info.plist
  under `NSAppTransportSecurity › NSExceptionDomains`. See the [Toolkit guide](/guides/toolkit/#authenticator).
- **Android: OAuth and IAP redirects.** The Kotlin Toolkit's sign-in pages come back to the app through
  its `AuthenticationActivity`. The toolkit's config plugin declares it for the redirect URIs in
  `oAuthRedirectUris`. iOS needs nothing for them.
- **Android: offline downloads.** On Android 13+, request the notification permission at runtime to
  see a download's progress.
- **Augmented reality.** iOS uses ARKit and Android uses ARCore. The config plugin's `ar` option
  makes ARCore optional by default, or required.

The minimum versions (iOS 18, Android API 28) are in [Getting started](/guides/getting-started/#requirements).
