import { Graphic, GraphicsOverlay, Map, MapView, type Symbol } from 'expo-arcgis';

// A multilayer point symbol composed from one or more picture-marker symbol layers (each an image
// at its own size / offset). Here a single pin image.
const PIN: Symbol = {
  type: 'multilayer-point',
  symbolLayers: [
    { type: 'picture-marker', url: 'https://static.arcgis.com/images/Symbols/Shapes/RedPin1LargeB.png', width: 36, height: 36 },
  ],
};

/** A `MultilayerPointSymbol` built from a picture-marker symbol layer. */
export default function MultilayerSymbol() {
  return (
    <Map basemap="arcGISNavigation" initialViewpoint={{ latitude: 34.05, longitude: -118.24, scale: 1_000_000 }}>
      <GraphicsOverlay>
        <Graphic geometry={{ type: 'point', x: -118.24, y: 34.05 }} symbol={PIN} />
      </GraphicsOverlay>
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
