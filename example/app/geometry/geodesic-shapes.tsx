import {
  Graphic,
  GraphicsOverlay,
  Map,
  MapView,
  geometryEngine,
  type PointGeometry,
  type Symbol,
} from 'expo-arcgis';

const CENTER: PointGeometry = { type: 'point', x: -100, y: 40 };

// Geodesic shapes follow the curvature of the earth. The ellipse and sector are built on the
// spheroid, so their edges stay true at continental scale.
const ELLIPSE = geometryEngine.ellipseGeodesic({
  center: CENTER,
  semiAxis1Length: 1_500_000,
  semiAxis2Length: 800_000,
  axisDirection: 45,
  linearUnit: 'meters',
  geometryType: 'polygon',
});

const SECTOR = geometryEngine.sectorGeodesic({
  center: CENTER,
  semiAxis1Length: 1_200_000,
  semiAxis2Length: 1_200_000,
  sectorAngle: 80,
  startDirection: 10,
  linearUnit: 'meters',
  geometryType: 'polygon',
});

const ELLIPSE_FILL: Symbol = { type: 'simple-fill', color: '#2c7fb855', outline: { color: '#2c7fb8', width: 2 } };
const SECTOR_FILL: Symbol = { type: 'simple-fill', color: '#e6394655', outline: { color: '#e63946', width: 2 } };

/** Builds a geodesic ellipse and a geodesic sector with `geometryEngine` and draws them. */
export default function GeodesicShapes() {
  return (
    <Map basemap="arcGISDarkGray" initialViewpoint={{ latitude: 40, longitude: -100, scale: 50_000_000 }}>
      <MapView style={{ flex: 1 }}>
        <GraphicsOverlay>
          {ELLIPSE && <Graphic geometry={ELLIPSE} symbol={ELLIPSE_FILL} />}
          {SECTOR && <Graphic geometry={SECTOR} symbol={SECTOR_FILL} />}
        </GraphicsOverlay>
      </MapView>
    </Map>
  );
}
