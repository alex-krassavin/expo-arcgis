import { Scene, SceneView } from 'expo-arcgis';

// A public ArcGIS Online web scene (portal item).
const WEB_SCENE_ID = '579f97b2f3b94d4a8e48a5f140a6639b';

/** Loads a 3D web scene from a portal item — layers, camera and lighting come from the item. */
export default function WebScene() {
  return (
    <Scene portalItem={{ itemId: WEB_SCENE_ID }}>
      <SceneView style={{ flex: 1 }} />
    </Scene>
  );
}
