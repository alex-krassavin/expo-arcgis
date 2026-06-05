import ArcGIS
import Foundation

/// Free functions backing the JS `coordinateFormatter` namespace. They convert a `point`
/// geometry to/from latitude-longitude, MGRS, USNG and UTM notation strings via
/// `ArcGIS.CoordinateFormatter`. Registered as module `Function`s in `ExpoArcgisModule`.

private func cfPoint(_ dict: [String: Any]?) -> Point? { dict.flatMap(geometryFromDict) as? Point }

// MARK: - Latitude-longitude

func cfToLatLong(_ p: [String: Any], _ format: String?, _ decimalPlaces: Int) -> String? {
  guard let point = cfPoint(p) else { return nil }
  return CoordinateFormatter.latitudeLongitudeString(from: point, format: latitudeLongitudeFormat(format), decimalPlaces: decimalPlaces)
}

func cfFromLatLong(_ coordinates: String, _ wkid: Int) -> [String: Any]? {
  CoordinateFormatter.point(fromLatitudeLongitudeString: coordinates, spatialReference: spatialReference(wkid: wkid)).map(dictFromGeometry)
}

// MARK: - MGRS

func cfToMgrs(_ p: [String: Any], _ mode: String?, _ precision: Int, _ addSpaces: Bool) -> String? {
  guard let point = cfPoint(p) else { return nil }
  return CoordinateFormatter.mgrsString(from: point, conversionMode: mgrsConversionMode(mode), precision: precision, addSpaces: addSpaces)
}

func cfFromMgrs(_ coordinates: String, _ wkid: Int, _ mode: String?) -> [String: Any]? {
  CoordinateFormatter.point(fromMGRSString: coordinates, spatialReference: spatialReference(wkid: wkid), conversionMode: mgrsConversionMode(mode)).map(dictFromGeometry)
}

// MARK: - USNG

func cfToUsng(_ p: [String: Any], _ precision: Int, _ addSpaces: Bool) -> String? {
  guard let point = cfPoint(p) else { return nil }
  return CoordinateFormatter.usngString(from: point, precision: precision, addSpaces: addSpaces)
}

func cfFromUsng(_ coordinates: String, _ wkid: Int) -> [String: Any]? {
  CoordinateFormatter.point(fromUSNGString: coordinates, spatialReference: spatialReference(wkid: wkid)).map(dictFromGeometry)
}

// MARK: - UTM

func cfToUtm(_ p: [String: Any], _ mode: String?, _ addSpaces: Bool) -> String? {
  guard let point = cfPoint(p) else { return nil }
  return CoordinateFormatter.utmString(from: point, conversionMode: utmConversionMode(mode), addSpaces: addSpaces)
}

func cfFromUtm(_ coordinates: String, _ wkid: Int, _ mode: String?) -> [String: Any]? {
  CoordinateFormatter.point(fromUTMString: coordinates, spatialReference: spatialReference(wkid: wkid), conversionMode: utmConversionMode(mode)).map(dictFromGeometry)
}
