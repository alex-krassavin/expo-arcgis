import { Scene, SceneView, type Surface } from 'expo-arcgis';

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
};

/**
 * An orbit camera controller locks the camera onto a fixed target and circles it as you drag —
 * ideal for inspecting a site from every side. Pass `{ type: 'globe' }` for free navigation.
 */
export default function CameraController() {
  return (
    <Scene basemap="arcGISImagery" surface={ELEVATION}>
      <SceneView
        style={{ flex: 1 }}
        cameraController={{ type: 'orbitLocation', target: { x: -112.115, y: 36.1, z: 600 }, distance: 6000 }}
      />
    </Scene>
  );
}
