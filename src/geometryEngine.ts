import Module from './ExpoArcgisGeometryModule';
import type {
  AreaUnit,
  GeodeticCurveType,
  GeodeticDistanceResult,
  Geometry,
  GeometryOffsetType,
  GeodesicEllipseParams,
  GeodesicSectorParams,
  LinearUnit,
  PointGeometry,
  ProximityResult,
} from './ExpoArcgis.types';

/**
 * Spatial operations mirroring `ArcGIS.GeometryEngine` (Swift) /
 * `com.arcgismaps.geometry.GeometryEngine` (Kotlin). Every call is synchronous and
 * works on plain `Geometry` values (see `GeometryCodec` on the native side).
 *
 * Planar operations (`buffer`, `area`, `length`, `distance`, …) assume a projected
 * coordinate system; their `geodesic*` counterparts measure on the spheroid and take
 * an optional unit + curve type.
 */
export const geometryEngine = {
  /** Re-projects a geometry into another coordinate system (by WKID). */
  project: (geometry: Geometry, spatialReference: number): Geometry | null =>
    Module.geProject(geometry, spatialReference),

  /** Planar buffer polygon at `distance` (in the geometry's units). */
  buffer: (geometry: Geometry, distance: number): Geometry | null =>
    Module.geBuffer(geometry, distance),

  /** Geodesic buffer polygon at `distance` in `unit` (default `meters`). */
  geodesicBuffer: (
    geometry: Geometry,
    distance: number,
    unit?: LinearUnit,
    curveType?: GeodeticCurveType,
    maxDeviation?: number
  ): Geometry | null =>
    Module.geGeodeticBuffer(geometry, distance, unit ?? null, maxDeviation ?? null, curveType ?? null),

  /** Planar area (negative if the ring is clockwise). */
  area: (geometry: Geometry): number => Module.geArea(geometry),

  /** Geodesic area in `unit` (default `squareMeters`). */
  geodesicArea: (geometry: Geometry, unit?: AreaUnit, curveType?: GeodeticCurveType): number =>
    Module.geGeodeticArea(geometry, unit ?? null, curveType ?? null),

  /** Planar length / perimeter. */
  length: (geometry: Geometry): number => Module.geLength(geometry),

  /** Geodesic length in `unit` (default `meters`). */
  geodesicLength: (geometry: Geometry, unit?: LinearUnit, curveType?: GeodeticCurveType): number =>
    Module.geGeodeticLength(geometry, unit ?? null, curveType ?? null),

  /** Planar distance between two geometries. */
  distance: (a: Geometry, b: Geometry): number | null => Module.geDistance(a, b),

  /** Geodesic distance + azimuths between two points, in `unit` (default `meters`). */
  geodesicDistance: (
    a: PointGeometry,
    b: PointGeometry,
    unit?: LinearUnit,
    curveType?: GeodeticCurveType
  ): GeodeticDistanceResult | null => Module.geGeodeticDistance(a, b, unit ?? null, curveType ?? null),

  /** Union of all input geometries. */
  union: (geometries: Geometry[]): Geometry | null => Module.geUnion(geometries),

  /** Intersection (overlap) of two geometries. */
  intersect: (a: Geometry, b: Geometry): Geometry | null => Module.geIntersection(a, b),

  /** Part of `a` that does not intersect `b`. */
  difference: (a: Geometry, b: Geometry): Geometry | null => Module.geDifference(a, b),

  /** Parts of `a` and `b` that do not intersect each other. */
  symmetricDifference: (a: Geometry, b: Geometry): Geometry | null =>
    Module.geSymmetricDifference(a, b),

  /** Clips a geometry to an envelope. */
  clip: (geometry: Geometry, envelope: Geometry): Geometry | null =>
    Module.geClip(geometry, envelope),

  /** Cuts a geometry with a polyline, returning the resulting parts. */
  cut: (geometry: Geometry, cutter: Geometry): Geometry[] => Module.geCut(geometry, cutter),

  /** Smallest convex polygon that contains the geometry. */
  convexHull: (geometry: Geometry): Geometry | null => Module.geConvexHull(geometry),

  /** Interior point suitable for placing a label inside a polygon. */
  labelPoint: (polygon: Geometry): Geometry | null => Module.geLabelPoint(polygon),

  /** Normalizes a geometry that crosses the antimeridian back into the −180…180 range. */
  normalizeCentralMeridian: (geometry: Geometry): Geometry | null =>
    Module.geNormalizeCentralMeridian(geometry),

  /** Reshapes a polyline/polygon using a `reshaper` polyline. */
  reshape: (geometry: Geometry, reshaper: Geometry): Geometry | null =>
    Module.geReshape(geometry, reshaper),

  /** All intersection geometries of two geometries (points, lines and/or polygons). */
  intersections: (a: Geometry, b: Geometry): Geometry[] => Module.geIntersections(a, b),

  /** Extends a polyline to meet an `extender` polyline. */
  extend: (polyline: Geometry, extender: Geometry): Geometry | null =>
    Module.geExtend(polyline, extender),

  /** Auto-completes polygons from existing polygon boundaries and new boundary polylines. */
  autoComplete: (existingPolygons: Geometry[], boundaries: Geometry[]): Geometry[] =>
    Module.geAutoComplete(existingPolygons, boundaries),

  /** Boundary of the geometry (polygon → polyline, polyline → multipoint). */
  boundary: (geometry: Geometry): Geometry | null => Module.geBoundary(geometry),

  /** Returns a topologically simple, valid copy of the geometry. */
  simplify: (geometry: Geometry): Geometry | null => Module.geSimplify(geometry),

  /** Adds vertices so no segment is longer than `maxSegmentLength`. */
  densify: (geometry: Geometry, maxSegmentLength: number): Geometry | null =>
    Module.geDensify(geometry, maxSegmentLength),

  /** Removes vertices within `maxDeviation` (Douglas–Peucker). */
  generalize: (
    geometry: Geometry,
    maxDeviation: number,
    removeDegenerateParts = false
  ): Geometry | null => Module.geGeneralize(geometry, maxDeviation, removeDegenerateParts),

  /** Offsets a geometry by `distance` with the given join style. */
  offset: (
    geometry: Geometry,
    distance: number,
    offsetType?: GeometryOffsetType,
    bevelRatio = 0,
    flattenError = 0
  ): Geometry | null => Module.geOffset(geometry, distance, offsetType ?? null, bevelRatio, flattenError),

  /** Envelope that contains both geometries' extents. */
  combineExtents: (a: Geometry, b: Geometry): Geometry | null => Module.geCombineExtents(a, b),

  /** True if `a` contains `b`. */
  contains: (a: Geometry, b: Geometry): boolean => Module.geContains(a, b),
  /** True if `a` crosses `b`. */
  crosses: (a: Geometry, b: Geometry): boolean => Module.geCrosses(a, b),
  /** True if `a` and `b` are disjoint. */
  disjoint: (a: Geometry, b: Geometry): boolean => Module.geDisjoint(a, b),
  /** True if `a` and `b` are spatially equal. */
  equals: (a: Geometry, b: Geometry): boolean => Module.geEquals(a, b),
  /** True if `a` and `b` intersect. */
  intersects: (a: Geometry, b: Geometry): boolean => Module.geIntersects(a, b),
  /** True if `a` and `b` overlap. */
  overlaps: (a: Geometry, b: Geometry): boolean => Module.geOverlaps(a, b),
  /** True if `a` and `b` touch only at a boundary. */
  touches: (a: Geometry, b: Geometry): boolean => Module.geTouches(a, b),
  /** True if `a` is within `b`. */
  within: (a: Geometry, b: Geometry): boolean => Module.geWithin(a, b),
  /** True if `a` and `b` satisfy the DE-9IM `relation` string. */
  relate: (a: Geometry, b: Geometry, relation: string): boolean => Module.geRelate(a, b, relation),
  /** True if the geometry is topologically simple. */
  isSimple: (geometry: Geometry): boolean => Module.geIsSimple(geometry),

  /** Nearest point on the geometry to `point`. */
  nearestCoordinate: (geometry: Geometry, point: PointGeometry): ProximityResult | null =>
    Module.geNearestCoordinate(geometry, point),

  /** Nearest vertex of the geometry to `point`. */
  nearestVertex: (geometry: Geometry, point: PointGeometry): ProximityResult | null =>
    Module.geNearestVertex(geometry, point),

  /** Moves a geometry by `(deltaX, deltaY)`. */
  move: (geometry: Geometry, deltaX: number, deltaY: number): Geometry | null =>
    Module.geMove(geometry, deltaX, deltaY),

  /** Rotates a geometry by `angle` degrees around `origin` (default: its centroid). */
  rotate: (geometry: Geometry, angle: number, origin?: PointGeometry): Geometry | null =>
    Module.geRotate(geometry, angle, origin ?? null),

  /** Scales a geometry by `(factorX, factorY)` relative to `origin` (default: its centroid). */
  scale: (
    geometry: Geometry,
    factorX: number,
    factorY: number,
    origin?: PointGeometry
  ): Geometry | null => Module.geScale(geometry, factorX, factorY, origin ?? null),

  /**
   * Constructs a geodesic ellipse as a polygon, polyline, or multipoint from the given params.
   * Mirrors `GeometryEngine.geodesicEllipse(parameters:)` (Swift) /
   * `GeometryEngine.ellipseGeodesicOrNull(parameters)` (Kotlin).
   */
  ellipseGeodesic: (params: GeodesicEllipseParams): Geometry | null =>
    Module.geEllipseGeodesic(params),

  /**
   * Constructs a geodesic sector (pie slice) from the given params.
   * Mirrors `GeometryEngine.geodesicSector(parameters:)` (Swift) /
   * `GeometryEngine.sectorGeodesicOrNull(parameters)` (Kotlin).
   */
  sectorGeodesic: (params: GeodesicSectorParams): Geometry | null =>
    Module.geSectorGeodesic(params),

  /**
   * Returns a copy of the geometry with `z` set as the Z (elevation) value on all vertices.
   * Mirrors `GeometryEngine.makeGeometry(from:z:)` (Swift) /
   * `GeometryEngine.createWithZOrNull(geometry, z)` (Kotlin).
   */
  withZ: (geometry: Geometry, z: number): Geometry | null =>
    Module.geWithZ(geometry, z),

  /**
   * Returns a copy of the geometry with `m` set as the M (measure) value on all vertices.
   * Mirrors `GeometryEngine.makeGeometry(from:m:)` (Swift) /
   * `GeometryEngine.createWithMOrNull(geometry, m)` (Kotlin).
   */
  withM: (geometry: Geometry, m: number): Geometry | null =>
    Module.geWithM(geometry, m),

  /**
   * Returns a copy of the geometry with both `z` (elevation) and `m` (measure) set on all vertices.
   * Mirrors `GeometryEngine.makeGeometry(from:z:m:)` (Swift) /
   * `GeometryEngine.createWithZAndMOrNull(geometry, z, m)` (Kotlin).
   */
  withZAndM: (geometry: Geometry, z: number, m: number): Geometry | null =>
    Module.geWithZAndM(geometry, z, m),
};
