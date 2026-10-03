import { Map, MapView } from 'expo-arcgis';
import { BasemapGallery } from 'expo-arcgis-toolkit';

/** The ArcGIS Toolkit's basemap gallery under the map: picking a basemap applies it to the map. */
export default function BasemapGallerySample() {
  return (
    <Map
      basemap="arcGISTopographic"
      initialViewpoint={{ latitude: 34.027, longitude: -118.805, scale: 72_000 }}
    >
      <MapView style={{ flex: 1 }} />
      <BasemapGallery style={{ height: 280 }} />
    </Map>
  );
}
