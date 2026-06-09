import { AnalysisOverlay, Scene, SceneView, Viewshed, type Camera, type Surface } from 'expo-arcgis';

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

/** Draws an exploratory viewshed (what's visible from an observer) over 3D terrain. */
export default function ViewshedSample() {
  return (
    <Scene basemap="arcGISImagery" camera={CAMERA} surface={ELEVATION}>
      <SceneView style={{ flex: 1 }}>
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
        </AnalysisOverlay>
      </SceneView>
    </Scene>
  );
}
