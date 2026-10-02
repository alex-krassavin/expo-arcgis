# expo-arcgis

The native **ArcGIS Maps SDK** for React Native, as [Expo modules](https://docs.expo.dev/modules/overview/).
The ArcGIS Maps SDKs for **Kotlin** (Android) and **Swift** (iOS) sit behind a declarative,
SDK-faithful component API.

📖 **[Documentation & samples →](https://mapforge.dev/expo-arcgis)**

## Packages

| Package | Status | What it is |
| --- | --- | --- |
| [`expo-arcgis`](packages/expo-arcgis#readme) | [on npm](https://www.npmjs.com/package/expo-arcgis) | The core. It provides maps and scenes (`<MapView>` / `<SceneView>`), layers, graphics, geometry and editing, plus query, analysis, geocoding, routing, offline, real-time and authentication. |
| [`expo-arcgis-toolkit`](packages/expo-arcgis-toolkit) | not published yet | Components from the ArcGIS Maps SDK Toolkits, built on the core: a compass, a scalebar and a basemap gallery. |

Add the core to an Expo app with:

```sh
npx expo install expo-arcgis
```

Setup, requirements and the API are in [its README](packages/expo-arcgis#readme) and in the documentation.

## Repository

- `packages/`: the npm packages, as npm workspaces.
- `example/`: an Expo app that runs every sample.
- `docs/`: the documentation site (Astro Starlight), published at mapforge.dev.
- `scripts/native-harness.js`: builds the packages in a fresh app for each supported Expo SDK, the
  way CI does.

## Development

```sh
npm install                 # installs every package and builds the core
npm run build -w expo-arcgis-toolkit
npm run check:api           # also: check:package, check:parity, test, lint
node scripts/native-harness.js --sdk 57 --platform android   # or ios, js
```

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

MIT © krassavin. See [LICENSE](LICENSE).
