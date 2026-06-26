import ArcGIS

/// Network-layer trust handler that accepts every server-trust challenge unconditionally.
/// Only install this for development or on-prem ArcGIS Enterprise with self-signed certificates —
/// it disables TLS certificate validation, which makes the connection vulnerable to
/// man-in-the-middle attacks. Never enable in production.
final class NetworkTrustHandler: NetworkAuthenticationChallengeHandler, @unchecked Sendable {
  static let shared = NetworkTrustHandler()

  func handleNetworkAuthenticationChallenge(
    _ challenge: NetworkAuthenticationChallenge
  ) async -> NetworkAuthenticationChallenge.Disposition {
    if challenge.kind == .serverTrust {
      return .continueWithCredential(.serverTrust)
    }
    return .continueWithoutCredential
  }
}
