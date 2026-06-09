import { Scene, SceneLayer, SceneView, type Camera } from 'expo-arcgis';

const SF_BUILDINGS =
  'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_Bldgs/SceneServer';

const CAMERA_SF: Camera = {
  position: { x: -122.4, y: 37.78, z: 600 },
  heading: 0,
  pitch: 65,
  roll: 0,
};

// A fixed sun position (summer solstice noon, Pacific) so the buildings cast clear shadows.
const SUN_TIME = Date.UTC(2024, 5, 21, 19, 0, 0);

/** Sun lighting with cast shadows over a 3D scene (`sunLighting` + `sunTime`). */
export default function LightAndShadows() {
  return (
    <Scene basemap="arcGISImagery">
      <SceneLayer url={SF_BUILDINGS} />
      <SceneView
        style={{ flex: 1 }}
        camera={CAMERA_SF}
        sunLighting="lightAndShadows"
        atmosphereEffect="realistic"
        sunTime={SUN_TIME}
      />
    </Scene>
  );
}
