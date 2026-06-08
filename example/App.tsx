import {
  AnalysisOverlay,
  coordinateFormatter,
  FeatureLayer,
  geocoder,
  geoprocessor,
  geometryEngine,
  GeometryEditor,
  Graphic,
  GraphicsOverlay,
  LineOfSight,
  Map,
  MapImageLayer,
  MapSettings,
  MapView,
  offline,
  router,
  Scene,
  SceneLayer,
  setTokenCredential,
  UtilityNetwork,
  Viewshed,
  SceneView,
  WmsLayer,
  type Camera,
  type Feature,
  type FeatureLayerHandle,
  type FeatureReduction,
  type Geometry,
  type LabelDefinition,
  type LocationEventPayload,
  type MapLoadErrorEventPayload,
  type MapViewHandle,
  type Renderer,
  type Surface,
  type TapEventPayload,
  type UtilityNetworkHandle,
  type UtilityTraceType,
  type Viewpoint,
} from 'expo-arcgis';
import { useRef, useState } from 'react';
import { Button, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// "Add a point, line, and polygon" tutorial geometries (Santa Monica Mountains).
const POINT = { x: -118.80657, y: 34.00059 };
const LINE_POINTS = [
  { x: -118.82152, y: 34.01395 },
  { x: -118.81489, y: 34.00806 },
  { x: -118.80887, y: 34.00166 },
];
const POLYGON_POINTS = [
  { x: -118.81898, y: 34.01375 },
  { x: -118.80679, y: 34.02158 },
  { x: -118.79143, y: 34.01638 },
  { x: -118.79596, y: 34.00856 },
  { x: -118.80855, y: 34.0035 },
];

// Viewpoint presets for the "Change viewpoint" sample.
const SANTA_MONICA: Viewpoint = { latitude: 34.027, longitude: -118.805, scale: 72_000 };
const GRIFFITH: Viewpoint = { latitude: 34.1184, longitude: -118.3004, scale: 40_000 };

// Public ArcGIS Online web map for the "Display a web map" sample.
const WEB_MAP_ID = '41281c51f9de45edaf1c8ed44bb10e30';

// Public ArcGIS Online web scene for the "Display a web scene" sample.
const WEB_SCENE_ID = '579f97b2f3b94d4a8e48a5f140a6639b';

// Public ArcGIS dynamic map service for the "Manage operational layers" sample.
const USA_MAP_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';

// Public WMS service (terrestris OSM) — one representative of the Layers section.
const WMS_URL = 'https://ows.terrestris.de/osm/service';

// Renderer for the "Style graphics with renderer" sample (styles symbol-less graphics).
const GREEN_RENDERER: Renderer = {
  type: 'simple',
  symbol: { type: 'simple-marker', style: 'diamond', color: '#34c759', size: 14 },
};

// "Styles & data visualization": a public world-cities feature layer styled by population.
const WORLD_CITIES =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer/0';
// Class-breaks renderer — graduated circles by the POP (population) field.
const CITIES_RENDERER: Renderer = {
  type: 'class-breaks',
  field: 'POP',
  classBreaks: [
    { min: 0, max: 1_000_000, symbol: { type: 'simple-marker', color: '#2c7fb8', size: 6 }, label: '< 1M' },
    { min: 1_000_000, max: 5_000_000, symbol: { type: 'simple-marker', color: '#7fcdbb', size: 11 }, label: '1–5M' },
    { min: 5_000_000, max: 50_000_000, symbol: { type: 'simple-marker', color: '#edf8b1', size: 18 }, label: '> 5M' },
  ],
};
// Labels — white city names with a dark halo.
const CITIES_LABELS: LabelDefinition[] = [
  {
    expression: '[CITY_NAME]',
    // For labels the text comes from `expression`; the symbol's own `text` is ignored.
    symbol: { type: 'text', text: '', color: '#ffffff', size: 11, haloColor: '#000000', haloWidth: 1.5 },
  },
];
// Clustering (feature reduction) for the same layer.
const CITY_CLUSTER: FeatureReduction = { type: 'cluster', radius: 60 };

// "Edit features": a public, anonymously-editable feature service (Esri sample).
const WILDFIRE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/0';

// "Device location": a short route for the simulated location data source (Santa Monica Mtns).
const ROUTE: Geometry = {
  type: 'polyline',
  points: [
    { x: -118.805, y: 34.0 },
    { x: -118.8, y: 34.005 },
    { x: -118.795, y: 34.01 },
    { x: -118.79, y: 34.012 },
  ],
};

// "Display a scene" tutorial camera + terrain (Santa Monica Mountains, in 3D).
const CAMERA: Camera = {
  position: { x: -118.804, y: 34.0, z: 5330 },
  heading: 355,
  pitch: 72,
  roll: 0,
};
const ELEVATION: Surface = {
  elevationSources: [
    {
      url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
    },
  ],
  elevationExaggeration: 2.5,
};

// Runtime camera presets for the "Change camera controller" sample.
const CAMERA_NORTH: Camera = { position: { x: -118.8, y: 33.96, z: 4000 }, heading: 0, pitch: 70, roll: 0 };
const CAMERA_EAST: Camera = { position: { x: -118.86, y: 34.0, z: 4000 }, heading: 90, pitch: 75, roll: 0 };

// Public 3D scene layer (San Francisco buildings) for the "Scene layer" sample.
const SF_BUILDINGS =
  'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_Bldgs/SceneServer';
const CAMERA_SF: Camera = { position: { x: -122.4, y: 37.78, z: 600 }, heading: 0, pitch: 65, roll: 0 };

// A fixed sun position (summer noon, Pacific) for the "Show light and shadows" sample.
const SUN_TIME = Date.UTC(2024, 5, 21, 19, 0, 0);
// Esri sample Viewshed geoprocessing service (public): observation point + distance → visible polygons.
const VIEWSHED_GP =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Elevation/ESRI_Elevation_World/GPServer/Viewshed';
// Esri sample offline-enabled web map (Naperville water network) + a small area of interest.
const OFFLINE_WEBMAP = 'acc027394bc84c2fb04d1ed317aac674';
const OFFLINE_AREA: Geometry = {
  type: 'envelope',
  xMin: -88.1526,
  yMin: 41.7694,
  xMax: -88.1387,
  yMax: 41.7799,
};
// Esri sample sync-enabled feature service (Save The Bay) + a small extent, for geodatabase sync.
const GDB_SERVICE =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Sync/SaveTheBaySync/FeatureServer';
const GDB_AREA: Geometry = { type: 'envelope', xMin: -71.43, yMin: 41.74, xMax: -71.37, yMax: 41.79 };
// Esri sample Naperville electric utility network (token-secured; public sample login).
const NAPERVILLE_UN =
  'https://sampleserver7.arcgisonline.com/server/rest/services/UtilityNetwork/NapervilleElectric/FeatureServer';
const UN_LOGIN = { username: 'viewer01', password: 'I68VGU^nMurF' };

export default function App() {
  const [status, setStatus] = useState('Loading map…');
  const [pin, setPin] = useState<TapEventPayload['mapPoint'] | null>(null);
  const [viewpoint, setViewpoint] = useState<Viewpoint | undefined>(undefined);
  const [webMap, setWebMap] = useState(false);
  const [showLayer, setShowLayer] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [wms, setWms] = useState(false);
  const [mode3D, setMode3D] = useState(false);
  const [webScene, setWebScene] = useState(false);
  const [sceneCamera, setSceneCamera] = useState<Camera | undefined>(undefined);
  const [buildings, setBuildings] = useState(false);
  const [shadows, setShadows] = useState(false);
  const [viewshed, setViewshed] = useState(true);
  const [buffer, setBuffer] = useState<Geometry | null>(null);
  const [draw, setDraw] = useState(false);
  const [cities, setCities] = useState(false);
  const [cluster, setCluster] = useState(false);
  const [editLayer, setEditLayer] = useState(false);
  const [editedId, setEditedId] = useState<number | null>(null);
  const [simulate, setSimulate] = useState(false);
  const [geocoded, setGeocoded] = useState<Geometry | null>(null);
  const [routeGeom, setRouteGeom] = useState<Geometry | null>(null);
  const [gpGeometries, setGpGeometries] = useState<Geometry[]>([]);
  const [un, setUn] = useState(false);
  const [offlinePath, setOfflinePath] = useState<string | null>(null);
  const mapRef = useRef<MapViewHandle>(null);
  const unRef = useRef<UtilityNetworkHandle>(null);
  const citiesRef = useRef<FeatureLayerHandle>(null);
  const editRef = useRef<FeatureLayerHandle>(null);

  // "Edit features" — add / move / delete a feature on an editable service via the layer ref.
  async function addHere() {
    if (!editRef.current || !pin) return setStatus('Enable “Edit layer” and tap the map first');
    const point = { type: 'point' as const, x: pin.longitude, y: pin.latitude };
    const id = await editRef.current.addFeature({}, point);
    setEditedId(id);
    setStatus(`Added feature #${id ?? '—'}`);
  }
  async function moveHere() {
    if (!editRef.current || editedId == null || !pin) return setStatus('Add a feature, then tap to move it');
    await editRef.current.updateFeature(editedId, {
      geometry: { type: 'point', x: pin.longitude, y: pin.latitude },
    });
    setStatus(`Moved feature #${editedId} to the tapped point`);
  }
  async function deleteFeature() {
    if (!editRef.current || editedId == null) return setStatus('Add a feature first');
    await editRef.current.deleteFeature(editedId);
    setStatus(`Deleted feature #${editedId}`);
    setEditedId(null);
  }

  // "Buffer pin" — geodesic buffer of the tapped pin + its lat/long readout (CoordinateFormatter).
  function bufferPin() {
    if (!pin) return;
    const point = { type: 'point' as const, x: pin.longitude, y: pin.latitude };
    setBuffer(geometryEngine.geodesicBuffer(point, 500, 'meters'));
    const dms = coordinateFormatter.toLatitudeLongitude(point, 'degreesMinutesSeconds', 1);
    setStatus(`Pin ${dms ?? '—'} · 500 m buffer`);
  }

  // "Big cities" — count features matching a SQL where clause (Query.queryFeatureCount).
  async function bigCities() {
    if (!citiesRef.current) return setStatus('Enable “Cities” first');
    const count = await citiesRef.current.queryFeatureCount({ whereClause: 'POP > 5000000' });
    setStatus(`Cities over 5M people: ${count}`);
  }

  // "Avg pop" — aggregate statistic over the layer (Query.queryStatistics).
  async function avgPop() {
    if (!citiesRef.current) return setStatus('Enable “Cities” first');
    const [record] = await citiesRef.current.queryStatistics({
      statistics: [{ field: 'POP', type: 'average', outName: 'avgPop' }],
    });
    const avg = record?.statistics.avgPop;
    setStatus(`Average city population: ${typeof avg === 'number' ? Math.round(avg).toLocaleString() : '—'}`);
  }

  // Identify the city under a tap (Query/Identify on the MapView ref).
  async function identifyAt(screenPoint: { x: number; y: number }) {
    if (!cities || !mapRef.current) return;
    const results = await mapRef.current.identify(screenPoint, { tolerance: 12, maxResults: 1 });
    const feature = results.find((r) => r.features.length > 0)?.features[0];
    if (feature) setStatus(`Identified: ${String(feature.attributes.CITY_NAME ?? '—')}`);
  }

  // "Find LA" — forward geocode an address to a point (geocoder namespace).
  async function findLA() {
    const [result] = await geocoder.geocode('Los Angeles, CA');
    if (result?.location) {
      setGeocoded(result.location);
      setStatus(`Found ${result.label} (score ${Math.round(result.score)})`);
    } else setStatus('No geocode result');
  }
  // "Reverse pin" — reverse geocode the tapped pin into an address.
  async function reversePin() {
    if (!pin) return setStatus('Tap the map first');
    const [result] = await geocoder.reverseGeocode({ type: 'point', x: pin.longitude, y: pin.latitude });
    setStatus(result ? `Address: ${result.label}` : 'No address found');
  }
  // "Suggest" — autocomplete a partial search.
  async function suggestPlaces() {
    const results = await geocoder.suggest('Coffee');
    setStatus(results.length ? `Suggestion: ${results[0].label}` : 'No suggestions');
  }
  // "Take offline" — generate an on-demand offline map, then display it (offline namespace).
  async function takeOffline() {
    setStatus('Taking map offline…');
    try {
      const { path } = await offline.generateOfflineMap(OFFLINE_WEBMAP, OFFLINE_AREA, 'offlineMap1');
      if (path) {
        setOfflinePath(path);
        setStatus('Offline map downloaded ✅');
      } else setStatus('Offline: no path returned');
    } catch (e) {
      setStatus(`Offline error: ${String(e)}`);
    }
  }
  // "Geodatabase" — generate a .geodatabase from a sync-enabled feature service (offline namespace).
  async function geodatabaseDemo() {
    setStatus('Geodatabase: generating…');
    try {
      const { path, tableCount } = await offline.generateGeodatabase(GDB_SERVICE, GDB_AREA, 'savethebay');
      setStatus(path ? `Geodatabase: ${tableCount} table(s) → ${path.split('/').pop()}` : 'Geodatabase: no path');
    } catch (e) {
      setStatus(`Geodatabase error: ${String(e)}`);
    }
  }
  // "Preplanned" — list the web map's preplanned areas and download the first (offline namespace).
  async function preplannedOffline() {
    setStatus('Preplanned: listing areas…');
    try {
      const areas = await offline.preplannedMapAreas(OFFLINE_WEBMAP);
      if (areas.length === 0) return setStatus('No preplanned areas');
      setStatus(`Downloading preplanned "${areas[0].title}"…`);
      const { path } = await offline.downloadPreplannedOfflineMap(OFFLINE_WEBMAP, areas[0].index, 'preplanned1');
      if (path) {
        setOfflinePath(path);
        setStatus(`Preplanned "${areas[0].title}" ✅ (${areas.length} areas)`);
      } else setStatus('Preplanned: no path returned');
    } catch (e) {
      setStatus(`Preplanned error: ${String(e)}`);
    }
  }
  // "Load UN" — authenticate, then mount the Naperville utility network (<UtilityNetwork>).
  async function loadUN() {
    setStatus('Utility network: authenticating…');
    try {
      await setTokenCredential(NAPERVILLE_UN, UN_LOGIN.username, UN_LOGIN.password);
      setUn(true);
    } catch (e) {
      setStatus(`UN auth error: ${String(e)}`);
    }
  }
  // "Trace ▸" — trace the utility network from a queried device and select the results.
  async function runTrace(traceType: UtilityTraceType) {
    if (!unRef.current) return setStatus('Load the utility network first');
    setStatus(`Trace (${traceType})…`);
    try {
      const result = await unRef.current.traceFromQuery('Electric Distribution Device', '1=1', traceType);
      setStatus(`Trace ${traceType}: ${result.elementCount} element(s)`);
    } catch (e) {
      setStatus(`Trace error: ${String(e)}`);
    }
  }
  // "Configs" — list the network's named trace configurations and trace with the first one.
  async function namedConfigTrace() {
    if (!unRef.current) return setStatus('Load the utility network first');
    try {
      const configs = await unRef.current.queryNamedTraceConfigurations();
      if (configs.length === 0) return setStatus('No named trace configurations');
      const result = await unRef.current.traceWithConfiguration(
        configs[0].globalId,
        'Electric Distribution Device',
        '1=1'
      );
      setStatus(`Config "${configs[0].name}": ${result.elementCount} elt (${configs.length} configs)`);
    } catch (e) {
      setStatus(`Config trace error: ${String(e)}`);
    }
  }
  // "Assoc" — associations of a queried device (connectivity / containment / attachment).
  async function showAssociations() {
    if (!unRef.current) return setStatus('Load the utility network first');
    try {
      const { count, kinds } = await unRef.current.associations('Electric Distribution Device', '1=1');
      setStatus(`Associations: ${count} (${kinds.join(', ') || 'none'})`);
    } catch (e) {
      setStatus(`Associations error: ${String(e)}`);
    }
  }
  // "Viewshed GP" — run the Esri Viewshed geoprocessing service (geoprocessor namespace).
  async function viewshedGP() {
    setStatus('Viewshed GP: running…');
    try {
      const { outputs } = await geoprocessor.execute(VIEWSHED_GP, {
        Input_Observation_Point: {
          type: 'features',
          geometries: [{ type: 'point', x: -118.49, y: 34.05 }],
        },
        Viewshed_Distance: { type: 'linearUnit', value: 2, unit: 'miles' },
      });
      const features = (outputs.Viewshed_Result as Feature[] | undefined) ?? [];
      const polygons = features
        .map((f) => f.geometry)
        .filter((g): g is Geometry => g != null);
      setGpGeometries(polygons);
      setStatus(`Viewshed GP: ${polygons.length} visible polygon(s)`);
    } catch (e) {
      setStatus(`Viewshed GP error: ${String(e)}`);
    }
  }
  // "Route" — solve a route between two LA-area stops (router namespace).
  async function solveRouteDemo() {
    const { routes } = await router.solveRoute([
      { point: { type: 'point', x: -118.4965, y: 34.0195 }, name: 'Santa Monica' },
      { point: { type: 'point', x: -118.2437, y: 34.0522 }, name: 'Downtown LA' },
    ]);
    const route = routes[0];
    if (route?.geometry) {
      setRouteGeom(route.geometry);
      const first = route.directions[0]?.text ?? '';
      const metrics = `${(route.totalLength / 1000).toFixed(1)} km · ${Math.round(route.travelTime)} min`;
      setStatus(`Route: ${metrics}${first ? ` — ${first}` : ''} (${route.directions.length} steps)`);
    } else setStatus('No route found');
  }

  async function toggleLocation() {
    if (!showLocation && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    setShowLocation((v) => !v);
  }

  // Graphics shared by the 2D map and the 3D scene (overlays work in both).
  const graphics = (
    <>
      <GraphicsOverlay>
        {/* Point — orange circle with a blue outline */}
        <Graphic
          geometry={{ type: 'point', ...POINT }}
          symbol={{
            type: 'simple-marker',
            style: 'circle',
            color: '#ffa500',
            size: 10,
            outline: { color: '#0000ff', width: 2 },
          }}
        />
        {/* Polyline — solid blue */}
        <Graphic
          geometry={{ type: 'polyline', points: LINE_POINTS }}
          symbol={{ type: 'simple-line', color: '#0000ff', width: 3 }}
        />
        {/* Polygon — translucent orange fill with a blue outline */}
        <Graphic
          geometry={{ type: 'polygon', points: POLYGON_POINTS }}
          symbol={{
            type: 'simple-fill',
            color: '#ffa50080',
            outline: { color: '#0000ff', width: 2 },
          }}
        />
        {/* Tap to drop an extra pin */}
        {pin && (
          <Graphic
            geometry={{ type: 'point', x: pin.longitude, y: pin.latitude }}
            symbol={{ type: 'simple-marker', color: '#ff3b30', size: 14 }}
          />
        )}
        {/* Geodesic buffer of the pin (GeometryEngine) */}
        {buffer && (
          <Graphic
            geometry={buffer}
            symbol={{ type: 'simple-fill', color: '#34c75955', outline: { color: '#34c759', width: 2 } }}
          />
        )}
        {/* Text symbol — a labeled point */}
        <Graphic
          geometry={{ type: 'point', x: -118.80657, y: 34.012 }}
          symbol={{
            type: 'text',
            text: 'Santa Monica Mtns',
            color: '#ffffff',
            size: 13,
            haloColor: '#1d3557',
            haloWidth: 2,
          }}
        />
        {/* Geocode result location */}
        {geocoded && (
          <Graphic
            geometry={geocoded}
            symbol={{ type: 'simple-marker', style: 'diamond', color: '#5856d6', size: 16 }}
          />
        )}
        {/* Solved route line */}
        {routeGeom && (
          <Graphic
            geometry={routeGeom}
            symbol={{ type: 'simple-line', color: '#5856d6', width: 4 }}
          />
        )}
        {/* Geoprocessing (viewshed) result polygons */}
        {gpGeometries.map((geometry, i) => (
          <Graphic
            key={`gp-${i}`}
            geometry={geometry}
            symbol={{
              type: 'simple-fill',
              color: '#ffb70366',
              outline: { color: '#ff6b00', width: 1 },
            }}
          />
        ))}
      </GraphicsOverlay>
      <GraphicsOverlay renderer={GREEN_RENDERER}>
        {/* Symbol-less graphics — drawn by the overlay's renderer */}
        <Graphic geometry={{ type: 'point', x: -118.79, y: 34.0 }} />
        <Graphic geometry={{ type: 'point', x: -118.83, y: 34.0 }} />
      </GraphicsOverlay>
    </>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <MapSettings config={{ apiKey: process.env.EXPO_PUBLIC_ARCGIS_API_KEY }}>
          {mode3D ? (
            <Scene
              key={webScene ? 'webscene' : 'scene'}
              basemap={webScene ? undefined : 'arcGISImagery'}
              camera={webScene ? undefined : CAMERA}
              surface={webScene ? undefined : ELEVATION}
              portalItem={webScene ? { itemId: WEB_SCENE_ID } : undefined}
            >
              {buildings && <SceneLayer url={SF_BUILDINGS} />}
              <SceneView
                style={styles.map}
                camera={sceneCamera}
                sunLighting={shadows ? 'lightAndShadows' : 'off'}
                atmosphereEffect={shadows ? 'realistic' : 'horizonOnly'}
                sunTime={shadows ? SUN_TIME : undefined}
                onSceneLoaded={() => setStatus('Scene loaded ✅ (3D terrain + camera)')}
                onSceneLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                  setStatus(`Scene error: ${event.nativeEvent.message}`)
                }
                onTap={(event: { nativeEvent: TapEventPayload }) =>
                  setPin(event.nativeEvent.mapPoint)
                }
              >
                {graphics}
                {/* 3D scene symbol — a sphere floating over the terrain */}
                <GraphicsOverlay>
                  <Graphic
                    geometry={{ type: 'point', x: -118.80657, y: 34.00059, z: 1500 }}
                    symbol={{
                      type: 'simple-marker-scene',
                      style: 'sphere',
                      color: '#e63946',
                      width: 400,
                      height: 400,
                      depth: 400,
                    }}
                  />
                </GraphicsOverlay>
                {/* Spatial analysis — exploratory viewshed over the terrain (toggle) */}
                {viewshed && (
                  <AnalysisOverlay>
                    <Viewshed
                      location={{ type: 'point', x: -118.80657, y: 34.00059, z: 1200 }}
                      heading={0}
                      pitch={70}
                      horizontalAngle={120}
                      verticalAngle={90}
                      minDistance={50}
                      maxDistance={4000}
                    />
                    <LineOfSight
                      observer={{ type: 'point', x: -118.80657, y: 34.00059, z: 1200 }}
                      target={{ type: 'point', x: -118.83, y: 34.012, z: 700 }}
                      onTargetVisibilityChange={(v) => setStatus(`Line of sight: target ${v}`)}
                    />
                  </AnalysisOverlay>
                )}
              </SceneView>
            </Scene>
          ) : offlinePath ? (
            <Map key={offlinePath} mobileMapPackagePath={offlinePath}>
              <MapView
                style={styles.map}
                onMapLoaded={() => setStatus('Offline map displayed ✅')}
                onMapLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                  setStatus(`Offline map error: ${event.nativeEvent.message}`)
                }
              />
            </Map>
          ) : (
            <Map
              key={webMap ? 'web' : 'base'}
              basemap={webMap ? undefined : 'arcGISTopographic'}
              initialViewpoint={webMap ? undefined : SANTA_MONICA}
              portalItem={webMap ? { itemId: WEB_MAP_ID } : undefined}
            >
              {showLayer && <MapImageLayer url={USA_MAP_SERVICE} opacity={0.7} />}
              {wms && <WmsLayer url={WMS_URL} layerNames={['OSM-WMS']} opacity={0.6} />}
              {un && (
                <UtilityNetwork
                  ref={unRef}
                  serviceGeodatabaseUrl={NAPERVILLE_UN}
                  onLoad={(name) => setStatus(`UN loaded: ${name}`)}
                  onLoadError={(message) => setStatus(`UN error: ${message}`)}
                />
              )}
              {/* Styled feature layer: class-breaks by population + labels (+ clustering toggle) */}
              {cities && (
                <FeatureLayer
                  ref={citiesRef}
                  url={WORLD_CITIES}
                  renderer={CITIES_RENDERER}
                  labelsEnabled
                  labels={CITIES_LABELS}
                  featureReduction={cluster ? CITY_CLUSTER : undefined}
                />
              )}
              {/* Editable feature layer — add / move / delete features via its ref */}
              {editLayer && <FeatureLayer ref={editRef} url={WILDFIRE} />}
              <MapView
                ref={mapRef}
                style={styles.map}
                viewpoint={viewpoint}
                locationDisplay={
                  simulate
                    ? { source: { type: 'simulated', route: ROUTE }, autoPanMode: 'navigation' }
                    : showLocation
                      ? { autoPanMode: 'recenter' }
                      : undefined
                }
                onLocationChange={(event: { nativeEvent: LocationEventPayload }) =>
                  setStatus(
                    `Location ${event.nativeEvent.position.latitude.toFixed(4)}, ${event.nativeEvent.position.longitude.toFixed(4)}`
                  )
                }
                onMapLoaded={() => setStatus('Map loaded ✅ — tap to drop a pin')}
                onMapLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                  setStatus(`Load error: ${event.nativeEvent.message}`)
                }
                onTap={(event: { nativeEvent: TapEventPayload }) => {
                  setPin(event.nativeEvent.mapPoint);
                  identifyAt(event.nativeEvent.screenPoint);
                }}
              >
                {graphics}
                {/* Interactive sketching — reports the drawn polygon's geodesic area */}
                {draw && (
                  <GeometryEditor
                    type="polygon"
                    onGeometryChange={(g) => {
                      if (!g) return;
                      const area = Math.abs(geometryEngine.geodesicArea(g, 'squareMeters'));
                      setStatus(`Sketch area: ${(area / 1e6).toFixed(3)} km²`);
                    }}
                  />
                )}
              </MapView>
            </Map>
          )}
        </MapSettings>
        <View style={styles.bar}>
          <View style={styles.buttons}>
            <Button title={mode3D ? '2D map' : '3D scene'} onPress={() => setMode3D((v) => !v)} />
            {mode3D ? (
              <>
                <Button
                  title={webScene ? 'Built scene' : 'Web scene'}
                  onPress={() => setWebScene((v) => !v)}
                />
                <Button title="Cam N" onPress={() => setSceneCamera(CAMERA_NORTH)} />
                <Button title="Cam E" onPress={() => setSceneCamera(CAMERA_EAST)} />
                <Button
                  title={buildings ? 'No bldgs' : 'Buildings'}
                  onPress={() => {
                    setBuildings((v) => !v);
                    setSceneCamera(CAMERA_SF);
                  }}
                />
                <Button title={shadows ? 'No shadows' : 'Shadows'} onPress={() => setShadows((v) => !v)} />
                <Button title={viewshed ? 'No viewshed' : 'Viewshed'} onPress={() => setViewshed((v) => !v)} />
              </>
            ) : (
              <>
                <Button title="Santa Monica" onPress={() => setViewpoint(SANTA_MONICA)} />
                <Button title="Griffith Obs." onPress={() => setViewpoint(GRIFFITH)} />
                <Button title={webMap ? 'Basemap' : 'Web map'} onPress={() => setWebMap((v) => !v)} />
                <Button title={showLayer ? 'Hide layer' : 'USA layer'} onPress={() => setShowLayer((v) => !v)} />
                <Button title={wms ? 'No WMS' : 'WMS'} onPress={() => setWms((v) => !v)} />
                <Button title={showLocation ? 'Hide me' : 'My location'} onPress={toggleLocation} />
                <Button title={simulate ? 'Stop sim' : 'Simulate'} onPress={() => setSimulate((v) => !v)} />
                <Button title="Buffer pin" onPress={bufferPin} />
                <Button title={draw ? 'Done' : 'Draw'} onPress={() => setDraw((v) => !v)} />
                <Button title={cities ? 'Hide cities' : 'Cities'} onPress={() => setCities((v) => !v)} />
                <Button title={cluster ? 'No cluster' : 'Cluster'} onPress={() => setCluster((v) => !v)} />
                <Button title="Big cities" onPress={bigCities} />
                <Button title="Avg pop" onPress={avgPop} />
                <Button title="Find LA" onPress={findLA} />
                <Button title="Reverse pin" onPress={reversePin} />
                <Button title="Viewshed GP" onPress={viewshedGP} />
                <Button title="Suggest" onPress={suggestPlaces} />
                <Button title="Route" onPress={solveRouteDemo} />
                <Button title={un ? 'UN loaded' : 'Load UN'} onPress={loadUN} />
                {un && <Button title="Connected" onPress={() => runTrace('connected')} />}
                {un && <Button title="Downstream" onPress={() => runTrace('downstream')} />}
                {un && <Button title="Configs" onPress={namedConfigTrace} />}
                {un && <Button title="Assoc" onPress={showAssociations} />}
                <Button title="Take offline" onPress={takeOffline} />
                <Button title="Preplanned" onPress={preplannedOffline} />
                <Button title="Geodatabase" onPress={geodatabaseDemo} />
                {offlinePath && <Button title="Back online" onPress={() => setOfflinePath(null)} />}
                <Button title={editLayer ? 'Hide edits' : 'Edit layer'} onPress={() => setEditLayer((v) => !v)} />
                <Button title="Add here" onPress={addHere} />
                <Button title="Move here" onPress={moveHere} />
                <Button title="Delete" onPress={deleteFeature} />
              </>
            )}
          </View>
          <Text style={styles.status}>{status}</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bar: { padding: 12, backgroundColor: '#101418' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  status: { color: '#ffffff', textAlign: 'center' },
});
