import { Map, MapView, RasterLayer } from 'expo-arcgis';

// Esri World Elevation image service.
const ELEVATION = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer';

// A Hillshade raster function — computed on-the-fly from the elevation raster (the source raster is
// wired in as the function's raster argument by the native layer).
const HILLSHADE = JSON.stringify({
  rasterFunction: 'Hillshade',
  rasterFunctionArguments: { Azimuth: 315, Altitude: 45, ZFactor: 1 },
  outputPixelType: 'U8',
});

/** Applies an on-the-fly Hillshade `rasterFunction` to an elevation image service. */
export default function RasterFunction() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 46.8, longitude: 8.2, scale: 1_500_000 }}>
      <RasterLayer source={{ type: 'imageService', url: ELEVATION }} rasterFunction={HILLSHADE} />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
