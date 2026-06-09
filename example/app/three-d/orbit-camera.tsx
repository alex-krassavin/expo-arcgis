import {
  Graphic,
  GraphicsOverlay,
  Scene,
  SceneView,
  type GraphicRef,
  type Surface,
} from 'expo-arcgis';
import { useState } from 'react';

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
};

/**
 * An orbit-GeoElement camera circles a `<Graphic>` and follows it as it moves. The graphic forwards
 * its ref (via a callback ref into state); once it has mounted, the camera controller and the
 * `orbitGraphic` prop both point at it.
 */
export default function OrbitCamera() {
  const [target, setTarget] = useState<GraphicRef | null>(null);

  return (
    <Scene basemap="arcGISImagery" surface={ELEVATION}>
      <SceneView
        style={{ flex: 1 }}
        cameraController={target ? { type: 'orbitGeoElement', distance: 4000 } : undefined}
        orbitGraphic={target}
      >
        <GraphicsOverlay>
          <Graphic
            ref={setTarget}
            geometry={{ type: 'point', x: -112.115, y: 36.1, z: 500 }}
            symbol={{ type: 'simple-marker', color: '#ffd166', size: 12 }}
          />
        </GraphicsOverlay>
      </SceneView>
    </Scene>
  );
}
