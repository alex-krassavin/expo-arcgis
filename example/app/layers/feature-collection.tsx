import { FeatureCollectionLayer, Map, MapView } from 'expo-arcgis';

const FIELDS = [
  { name: 'name', type: 'text' as const },
  { name: 'magnitude', type: 'double' as const },
];

const FEATURES = [
  { attributes: { name: 'A', magnitude: 4.1 }, geometry: { type: 'point' as const, x: -118.2, y: 34.05 } },
  { attributes: { name: 'B', magnitude: 5.6 }, geometry: { type: 'point' as const, x: -117.9, y: 34.1 } },
  { attributes: { name: 'C', magnitude: 3.2 }, geometry: { type: 'point' as const, x: -118.4, y: 33.9 } },
];

/** Builds an in-memory layer from a client-side schema + features (no feature service). */
export default function FeatureCollection() {
  return (
    <Map basemap="arcGISTopographic" initialViewpoint={{ latitude: 34.02, longitude: -118.15, scale: 600_000 }}>
      <FeatureCollectionLayer
        fields={FIELDS}
        features={FEATURES}
        renderer={{
          type: 'simple',
          symbol: {
            type: 'simple-marker',
            color: '#e63946',
            size: 12,
            outline: { color: '#ffffff', width: 1.5 },
          },
        }}
      />
      <MapView style={{ flex: 1 }} />
    </Map>
  );
}
