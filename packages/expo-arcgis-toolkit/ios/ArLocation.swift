import ArcGIS
import Foundation

/// A scene location from its JS form, `{ latitude, longitude, altitude? }` (WGS84, meters).
func arLocation(_ value: Any?) -> Point? {
  guard let dict = value as? [String: Any],
        let latitude = (dict["latitude"] as? NSNumber)?.doubleValue,
        let longitude = (dict["longitude"] as? NSNumber)?.doubleValue
  else { return nil }
  let altitude = (dict["altitude"] as? NSNumber)?.doubleValue ?? 0
  return Point(x: longitude, y: latitude, z: altitude, spatialReference: .wgs84)
}

func double(_ value: Any?) -> Double? {
  (value as? NSNumber)?.doubleValue
}
