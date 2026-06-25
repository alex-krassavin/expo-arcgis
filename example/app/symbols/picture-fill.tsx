import { Graphic, GraphicsOverlay, Map, MapView } from 'expo-arcgis';

// A rectangle in the Santa Monica Mountains.
const POLYGON_POINTS = [
  { x: -118.85, y: 34.04 },
  { x: -118.76, y: 34.04 },
  { x: -118.76, y: 33.98 },
  { x: -118.85, y: 33.98 },
];

const TEXTURE = 'https://static.arcgis.com/images/Symbols/Shapes/BlackStarLargeB.png';

/** Fills a polygon by tiling an image from a URL with a `picture-fill` symbol. */
export default function PictureFill() {
  return (
    <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.01, longitude: -118.8, scale: 200_000 }}>
      <MapView style={{ flex: 1 }}>
        <GraphicsOverlay>
          <Graphic
            geometry={{ type: 'polygon', points: POLYGON_POINTS }}
            symbol={{
              type: 'picture-fill',
              url: TEXTURE,
              width: 24,
              height: 24,
              outline: { color: '#1d3557', width: 2 },
            }}
          />
        </GraphicsOverlay>
      </MapView>
    </Map>
  );
}
