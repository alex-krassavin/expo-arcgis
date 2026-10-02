import Module from './ExpoArcgisGeometryModule';
import type {
  LatitudeLongitudeFormat,
  MgrsConversionMode,
  PointGeometry,
  UtmConversionMode,
} from './ExpoArcgis.types';

/**
 * Converts `point` geometries to/from coordinate notation strings, mirroring
 * `ArcGIS.CoordinateFormatter` (Swift) / `com.arcgismaps.geometry.CoordinateFormatter`
 * (Kotlin). The `from*` calls return a `point` in `spatialReference` (WKID, default WGS84),
 * or `null` if the string can't be parsed.
 */
export const coordinateFormatter = {
  /** Formats a point as a latitude-longitude string. */
  toLatitudeLongitude: (
    point: PointGeometry,
    format?: LatitudeLongitudeFormat,
    decimalPlaces = 6
  ): string | null => Module.cfToLatLong(point, format ?? null, decimalPlaces),

  /** Parses a latitude-longitude string into a point. */
  fromLatitudeLongitude: (coordinates: string, spatialReference = 4326): PointGeometry | null =>
    Module.cfFromLatLong(coordinates, spatialReference) as PointGeometry | null,

  /** Formats a point as an MGRS string. */
  toMgrs: (
    point: PointGeometry,
    mode?: MgrsConversionMode,
    precision = 5,
    addSpaces = true
  ): string | null => Module.cfToMgrs(point, mode ?? null, precision, addSpaces),

  /** Parses an MGRS string into a point. */
  fromMgrs: (
    coordinates: string,
    spatialReference = 4326,
    mode?: MgrsConversionMode
  ): PointGeometry | null =>
    Module.cfFromMgrs(coordinates, spatialReference, mode ?? null) as PointGeometry | null,

  /** Formats a point as a USNG string. */
  toUsng: (point: PointGeometry, precision = 5, addSpaces = true): string | null =>
    Module.cfToUsng(point, precision, addSpaces),

  /** Parses a USNG string into a point. */
  fromUsng: (coordinates: string, spatialReference = 4326): PointGeometry | null =>
    Module.cfFromUsng(coordinates, spatialReference) as PointGeometry | null,

  /** Formats a point as a UTM string. */
  toUtm: (point: PointGeometry, mode?: UtmConversionMode, addSpaces = true): string | null =>
    Module.cfToUtm(point, mode ?? null, addSpaces),

  /** Parses a UTM string into a point. */
  fromUtm: (
    coordinates: string,
    spatialReference = 4326,
    mode?: UtmConversionMode
  ): PointGeometry | null =>
    Module.cfFromUtm(coordinates, spatialReference, mode ?? null) as PointGeometry | null,
};
