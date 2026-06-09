import { Scene, SceneView, type Camera, type Surface } from 'expo-arcgis';

const CAMERA: Camera = {
  position: { x: -118.804, y: 34.0, z: 5330 },
  heading: 355,
  pitch: 72,
  roll: 0,
};

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
  elevationExaggeration: 2.5,
};

/** A 3D scene with world terrain and an initial camera over the Santa Monica Mountains. */
export default function SceneSample() {
  return (
    <Scene basemap="arcGISImagery" surface={ELEVATION}>
      <SceneView style={{ flex: 1 }} camera={CAMERA} />
    </Scene>
  );
}
