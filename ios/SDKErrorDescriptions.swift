import ArcGIS
import Foundation

/// Describes an ArcGIS SDK error for logs and for JS.
///
/// The SDK's error types are plain Swift errors, not `LocalizedError`, so `localizedDescription` —
/// which both our load events and Expo's rejected-call errors use — collapses them to "The operation
/// couldn't be completed. (ArcGIS.ArcGISAuthenticationError error 4.)". That says nothing; the error
/// itself knows it is `invalidToken`. Read what the error carries instead: the case (and its details)
/// for the enums, `code` / `description` / `details` for the structs.
func describeSDKError(_ error: Error) -> String {
  let typeName = String(describing: type(of: error))
  let mirror = Mirror(reflecting: error)
  if mirror.displayStyle == .enum {
    // e.g. "ArcGISAuthenticationError.invalidToken", "MappingError.missingSpatialReference(details: …)"
    return "\(typeName).\(error)"
  }
  var fields: [String: Any] = [:]
  for child in mirror.children {
    if let label = child.label { fields[label] = child.value }
  }
  let text = ["description", "details"]
    .compactMap { fields[$0] as? String }
    .filter { !$0.isEmpty }
  let code = (fields["code"] as? Int).map { " (\($0))" } ?? ""
  return text.isEmpty ? "\(typeName)\(code)" : "\(typeName)\(code): \(text.joined(separator: " — "))"
}

// Each conformance makes `localizedDescription` — and so every rejection Expo builds from it —
// carry the description above. NetworkAnalystError is already a LocalizedError and is left alone.
// Should a future SDK adopt LocalizedError itself, the duplicate conformance fails the build, and
// these lines can go.
extension ArcGISError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension ServiceError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension ArcGISAuthenticationError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension ArcGISChallengeCancellationError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension AnalysisError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension ExpirationError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension FeatureFormError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension FileNotFoundError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension GeocodeError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension GeodatabaseError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension GeotriggerError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension GeoViewCriticalError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension GeoViewGeoModelError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension IllegalStateError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension InvalidArgumentError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension InvalidCallError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension JSONError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension LicensingError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension MappingError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension MotionSensorError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension NotFoundError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension ObjectAlreadyInUseError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension OSStatusError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension OutOfRangeError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
extension SymbolDictionaryError: @retroactive LocalizedError { public var errorDescription: String? { describeSDKError(self) } }
