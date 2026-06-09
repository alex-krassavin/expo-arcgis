---
title: Concepts
description: How the declarative, SDK-faithful API is organized.
---

`expo-arcgis` mirrors the ArcGIS Maps SDK object model as React components — one component per SDK
class. If you know the ArcGIS SDK, the component names and props will feel familiar; if you know
React, the composition will.

## Models and views

The map is split into a **model** and a **view host**, exactly like the SDK:

- `<Map>` / `<Scene>` — the model (basemap, layers, initial viewpoint / camera).
- `<MapView>` / `<SceneView>` — the host that renders the model. This is the only real native view.

```tsx
<Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34, longitude: -118, scale: 72_000 }}>
  <MapView style={{ flex: 1 }} />
</Map>
```

## Global settings

`<MapSettings>` applies global configuration — most importantly the API key — to everything inside
it. Place it once near the root (or set the key imperatively with `ExpoArcgis.setApiKey()`).

```tsx
<MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
  {/* maps and scenes */}
</MapSettings>
```

## Layers and graphics are children

Operational layers, graphics overlays and 3D analyses are declared as children of the model or the
view — add or remove them by rendering them conditionally.

```tsx
<Map basemap="arcGISNavigation">
  <FeatureLayer url={FEATURE_SERVICE} renderer={renderer} />
  <GraphicsOverlay>
    <Graphic geometry={point} symbol={{ type: 'simple-marker', color: '#ffa500', size: 10 }} />
  </GraphicsOverlay>
  <MapView style={{ flex: 1 }} />
</Map>
```

Composition is wired through React Context — a child finds its parent `<Map>` / `<MapView>` and
attaches itself. You don't pass handles around manually.

A `<GroupLayer>` is itself a layer **and** a layer host: any layers you nest inside it join the
group as a single unit instead of attaching to the map directly.

```tsx
<GroupLayer opacity={0.85}>
  <MapImageLayer url={MAP_SERVICE} />
  <FeatureLayer url={FEATURE_SERVICE} />
</GroupLayer>
```

Layers and graphics carry the full symbology model: simple, picture, text, 3D scene and
**composite** symbols; simple, unique-value and class-breaks **renderers** with optional
**visual variables** (data-driven size / colour / rotation / opacity) and **dictionary
renderers** for military / utility symbology; plus client-side and scale-dependent display
filters, and per-layer `minScale` / `maxScale` visibility.

## Refs for imperative operations

Some operations act on a specific object at runtime — querying a layer, editing features, identifying
on a view, tracing a utility network. Reach those through a `ref`:

```tsx
const layer = useRef<FeatureLayerHandle>(null);
// ...
<FeatureLayer ref={layer} url={FEATURE_SERVICE} />;
// ...
const count = await layer.current?.queryFeatureCount({ whereClause: 'POP > 5000000' });
```

A handle exposes the object's full runtime surface. On a `<FeatureLayer>` that includes batch
editing — make several edits with `apply: false`, then push them at once with `applyEdits()` (or
discard with `undoLocalEdits()`) — `queryRelatedFeatures(objectId)`, and attachment CRUD
(`queryAttachments` / `addAttachment` / `fetchAttachment` / `deleteAttachment`). A `<MapView>` /
`<SceneView>` handle adds `identifyPopups(screenPoint)`, which returns each tapped feature's
evaluated popup title and fields. A `<DynamicEntityLayer>` handle adds `queryObservations(id)` for an
entity's recent track. A `<UtilityNetwork>` handle adds `validateNetworkTopology(extent)`,
`getState()` and `getTerminalConfigurations()`.

## Namespaces (no view needed)

Service operations that don't belong to a view live on namespaces you can call from anywhere:
`geometryEngine`, `coordinateFormatter`, `geocoder` (including `suggest` → `geocodeSuggestion` for a
precise suggestion round-trip), `router`, `geoprocessor`, `offline`, and `auth` (API key, token /
per-service / OAuth credentials, and sign-out).

```ts
const buffered = geometryEngine.geodesicBuffer(point, 500, 'meters');
const [match] = await geocoder.geocode('Los Angeles, CA');
```

## Long-running jobs

Offline downloads and geoprocessing return a **`JobRef`** — observe its progress, await its result,
or cancel it.

```ts
const job = await offline.generateOfflineMap(itemId, area, 'offline1');
const subscription = job.addListener('onProgress', ({ progress }) => console.log(`${progress}%`));
const { path } = await job.result();
subscription.remove();
```

See the [Samples](/expo-arcgis/samples/display-map/) for a runnable screen behind each capability, and
the [API Reference](/expo-arcgis/api/) for every component and type.
