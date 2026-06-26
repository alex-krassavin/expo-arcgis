import {
  Graphic,
  GraphicsOverlay,
  Scene,
  SceneView,
  type Camera,
  type GraphicRef,
  type Surface,
} from 'expo-arcgis';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
};

// `ModelSceneSymbol` loads its model from a LOCAL file, so the public glTF (the Khronos "Duck") is
// downloaded to the cache once, then the `file://` path is handed to the symbol.
const MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb';

const POINT = { type: 'point', x: -112.115, y: 36.2, z: 3500 } as const;
// Initial view over the Grand Canyon, until the model loads and the orbit camera frames it.
const CAMERA: Camera = { position: { x: -112.115, y: 36.0, z: 6000 }, heading: 0, pitch: 70, roll: 0 };

/**
 * A `ModelSceneSymbol` renders a 3D glTF model at a point graphic in a `<SceneView>`. Once the model
 * has downloaded and mounted, an orbit-GeoElement camera frames it. The model floats above the Grand
 * Canyon rim (graphics overlays place `z` as an absolute height).
 */
export default function ModelScene() {
  const [target, setTarget] = useState<GraphicRef | null>(null);
  const [modelUri, setModelUri] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    FileSystem.downloadAsync(MODEL_URL, `${FileSystem.cacheDirectory}duck.glb`)
      .then((res) => alive && setModelUri(res.uri))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Scene basemap="arcGISImagery" surface={ELEVATION}>
      <SceneView
        style={{ flex: 1 }}
        camera={CAMERA}
        cameraController={target ? { type: 'orbitGeoElement', distance: 250 } : undefined}
        orbitGraphic={target}
      >
        <GraphicsOverlay>
          {modelUri && (
            <Graphic
              ref={setTarget}
              geometry={POINT}
              symbol={{ type: 'model-scene', url: modelUri, sizeUnits: 'dips', scale: 100, heading: 45 }}
            />
          )}
        </GraphicsOverlay>
      </SceneView>
    </Scene>
  );
}
