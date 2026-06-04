import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapImageLayer,
  MapSettings,
  MapView,
  Scene,
  SceneView,
  type Camera,
  type MapLoadErrorEventPayload,
  type Renderer,
  type Surface,
  type TapEventPayload,
  type Viewpoint,
} from 'expo-arcgis';
import { useState } from 'react';
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

// Public ArcGIS dynamic map service for the "Manage operational layers" sample.
const USA_MAP_SERVICE = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';

// Renderer for the "Style graphics with renderer" sample (styles symbol-less graphics).
const GREEN_RENDERER: Renderer = {
  type: 'simple',
  symbol: { type: 'simple-marker', style: 'diamond', color: '#34c759', size: 14 },
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

export default function App() {
  const [status, setStatus] = useState('Loading map…');
  const [pin, setPin] = useState<TapEventPayload['mapPoint'] | null>(null);
  const [viewpoint, setViewpoint] = useState<Viewpoint | undefined>(undefined);
  const [webMap, setWebMap] = useState(false);
  const [showLayer, setShowLayer] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [mode3D, setMode3D] = useState(false);

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
            <Scene basemap="arcGISImagery" camera={CAMERA} surface={ELEVATION}>
              <SceneView
                style={styles.map}
                onSceneLoaded={() => setStatus('Scene loaded ✅ (3D terrain + camera)')}
                onSceneLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                  setStatus(`Scene error: ${event.nativeEvent.message}`)
                }
                onTap={(event: { nativeEvent: TapEventPayload }) =>
                  setPin(event.nativeEvent.mapPoint)
                }
              >
                {graphics}
              </SceneView>
            </Scene>
          ) : (
            <Map
              key={webMap ? 'web' : 'base'}
              basemap={webMap ? undefined : 'arcGISTopographic'}
              initialViewpoint={webMap ? undefined : SANTA_MONICA}
              portalItem={webMap ? { itemId: WEB_MAP_ID } : undefined}
            >
              {showLayer && <MapImageLayer url={USA_MAP_SERVICE} opacity={0.7} />}
              <MapView
                style={styles.map}
                viewpoint={viewpoint}
                locationDisplay={showLocation ? { autoPanMode: 'recenter' } : undefined}
                onMapLoaded={() => setStatus('Map loaded ✅ — tap to drop a pin')}
                onMapLoadError={(event: { nativeEvent: MapLoadErrorEventPayload }) =>
                  setStatus(`Load error: ${event.nativeEvent.message}`)
                }
                onTap={(event: { nativeEvent: TapEventPayload }) =>
                  setPin(event.nativeEvent.mapPoint)
                }
              >
                {graphics}
              </MapView>
            </Map>
          )}
        </MapSettings>
        <View style={styles.bar}>
          <View style={styles.buttons}>
            <Button title={mode3D ? '2D map' : '3D scene'} onPress={() => setMode3D((v) => !v)} />
            <Button title="Santa Monica" onPress={() => setViewpoint(SANTA_MONICA)} />
            <Button title="Griffith Obs." onPress={() => setViewpoint(GRIFFITH)} />
            <Button title={webMap ? 'Basemap' : 'Web map'} onPress={() => setWebMap((v) => !v)} />
            <Button title={showLayer ? 'Hide layer' : 'USA layer'} onPress={() => setShowLayer((v) => !v)} />
            <Button title={showLocation ? 'Hide me' : 'My location'} onPress={toggleLocation} />
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
