import { ImageOverlay, Map, MapView, type Envelope } from 'expo-arcgis';

import { SampleScreen } from '../../src/SampleScreen';

// <ImageOverlay> draws a *local* image file stretched to a geographic extent. There's no bundled
// image here, so point IMAGE_PATH at a real local file (e.g. one downloaded into
// FileSystem.documentDirectory, or a georeferenced weather/radar frame) to see it draw. A missing
// file is a no-op, so the map still renders.
const IMAGE_PATH = '/path/to/local-overlay.png';
const EXTENT: Envelope = { xMin: -120, yMin: 33, xMax: -116, yMax: 36 };

/**
 * Displays a georeferenced local image stretched over a map extent. Updating `imagePath` swaps the
 * frame — drive an animation by cycling a sequence of images.
 */
export default function ImageOverlaySample() {
  return (
    <SampleScreen status="Set IMAGE_PATH to a local image file to see the overlay draw.">
      <Map
        basemap="arcGISTopographic"
        initialViewpoint={{ latitude: 34.5, longitude: -118, scale: 6_000_000 }}
      >
        <MapView style={{ flex: 1 }}>
          <ImageOverlay imagePath={IMAGE_PATH} extent={EXTENT} opacity={0.7} />
        </MapView>
      </Map>
    </SampleScreen>
  );
}
