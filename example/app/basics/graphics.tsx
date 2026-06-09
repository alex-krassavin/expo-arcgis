import { Graphic, GraphicsOverlay, Map, MapView } from 'expo-arcgis';

const POINT = { x: -118.80657, y: 34.00059 };
const LINE_POINTS = [
  { x: -118.821, y: 34.0138 },
  { x: -118.799, y: 34.0048 },
  { x: -118.8049, y: 33.9925 },
];
const POLYGON_POINTS = [
  { x: -118.818, y: 34.0021 },
  { x: -118.8086, y: 34.0035 },
  { x: -118.8055, y: 33.9961 },
  { x: -118.8154, y: 33.9938 },
];

/** Draws a point, a polyline and a polygon as graphics on a `<GraphicsOverlay>`. */
export default function Graphics() {
  return (
    <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.0, longitude: -118.81, scale: 60_000 }}>
      <GraphicsOverlay>
        <Graphic
          geometry={{ type: 'point', ...POINT }}
          symbol={{
            type: 'simple-marker',
            style: 'circle',
            color: '#ffa500',
            size: 12,
            outline: { color: '#0000ff', width: 2 },
          }}
        />
        <Graphic
          geometry={{ type: 'polyline', points: LINE_POINTS }}
          symbol={{ type: 'simple-line', color: '#0000ff', width: 3 }}
        />
        <Graphic
          geometry={{ type: 'polygon', points: POLYGON_POINTS }}
          symbol={{ type: 'simple-fill', color: '#ffa50080', outline: { color: '#0000ff', width: 2 } }}
        />
      </GraphicsOverlay>
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
