import { GeometryEditor, Map, MapView, geometryEngine } from 'expo-arcgis';
import { useState } from 'react';

import { SampleScreen } from '../../src/SampleScreen';

/** Interactive sketching with the `<GeometryEditor>` — reports the drawn polygon's geodesic area. */
export default function GeometryEditorSample() {
  const [status, setStatus] = useState('Sketch a polygon on the map.');

  return (
    <SampleScreen status={status}>
      <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.0, longitude: -118.81, scale: 80_000 }}>
        <MapView style={{ flex: 1 }}>
          <GeometryEditor
            type="polygon"
            tool="freehand"
            onGeometryChange={(geometry) => {
              if (!geometry) return;
              const area = Math.abs(geometryEngine.geodesicArea(geometry, 'squareMeters'));
              setStatus(`Sketch area: ${(area / 1e6).toFixed(3)} km²`);
            }}
          />
        </MapView>
      </Map>
    </SampleScreen>
  );
}
