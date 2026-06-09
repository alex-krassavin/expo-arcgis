import { Graphic, GraphicsOverlay, Map, MapView } from 'expo-arcgis';

/** Draws a labeled point with a `text` symbol (white text + dark halo). */
export default function TextSymbol() {
  return (
    <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.012, longitude: -118.8066, scale: 50_000 }}>
      <GraphicsOverlay>
        <Graphic
          geometry={{ type: 'point', x: -118.8066, y: 34.012 }}
          symbol={{
            type: 'text',
            text: 'Santa Monica Mtns',
            color: '#ffffff',
            size: 14,
            haloColor: '#1d3557',
            haloWidth: 2,
          }}
        />
      </GraphicsOverlay>
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
