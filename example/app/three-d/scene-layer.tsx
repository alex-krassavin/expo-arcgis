import { Scene, SceneLayer, SceneView, type Camera } from 'expo-arcgis';

// Public 3D object scene layer — San Francisco buildings.
const SF_BUILDINGS =
  'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_Bldgs/SceneServer';

const CAMERA_SF: Camera = {
  position: { x: -122.4, y: 37.78, z: 600 },
  heading: 0,
  pitch: 65,
  roll: 0,
};

/** Adds a 3D object scene layer (textured buildings) to a scene. */
export default function SceneLayerSample() {
  return (
    <Scene basemap="arcGISImagery">
      <SceneLayer url={SF_BUILDINGS} />
      <SceneView style={{ flex: 1 }} camera={CAMERA_SF} />
    </Scene>
  );
}
