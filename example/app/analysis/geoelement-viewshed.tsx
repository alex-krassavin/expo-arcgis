import {
  AnalysisOverlay,
  Graphic,
  GraphicsOverlay,
  Scene,
  SceneView,
  Viewshed,
  type Camera,
  type GraphicRef,
  type Surface,
} from 'expo-arcgis';
import { useState } from 'react';

const CAMERA: Camera = { position: { x: -118.804, y: 33.997, z: 5330 }, heading: 355, pitch: 72, roll: 0 };

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
  elevationExaggeration: 2.5,
};

/**
 * A GeoElement-anchored viewshed follows a `<Graphic>` instead of a fixed point — move the graphic
 * and the visible area moves with it. The graphic forwards its native ref (via a callback ref into
 * state) so the `<Viewshed>` can attach to it once it has mounted.
 */
export default function GeoElementViewshed() {
  const [observer, setObserver] = useState<GraphicRef | null>(null);

  return (
    <Scene basemap="arcGISImagery" camera={CAMERA} surface={ELEVATION}>
      <SceneView style={{ flex: 1 }}>
        <GraphicsOverlay>
          <Graphic
            ref={setObserver}
            geometry={{ type: 'point', x: -118.80657, y: 34.00059, z: 1200 }}
            symbol={{ type: 'simple-marker', color: '#ffd166', size: 10 }}
          />
        </GraphicsOverlay>
        <AnalysisOverlay>
          {observer && (
            <Viewshed
              graphic={observer}
              headingOffset={0}
              pitchOffset={0}
              horizontalAngle={120}
              verticalAngle={90}
              minDistance={50}
              maxDistance={4000}
            />
          )}
        </AnalysisOverlay>
      </SceneView>
    </Scene>
  );
}
