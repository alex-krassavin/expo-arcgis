import ArcGIS
import Foundation

/// Reactive token-auth handler — the pattern the docs recommend over pre-adding credentials by hand.
/// The SDK calls this whenever a secured resource needs credentials, passing the exact `challenge`
/// (URL / referer), so the right token is minted for the right resource at the right time.
final class AuthChallengeHandler: ArcGISAuthenticationChallengeHandler, @unchecked Sendable {
  static let shared = AuthChallengeHandler()

  private var username: String?
  private var password: String?

  /// Stores (or clears, when nil) the login the handler uses to mint token credentials on demand.
  func setCredentials(username: String?, password: String?) {
    self.username = username
    self.password = password
  }

  func handleArcGISAuthenticationChallenge(
    _ challenge: ArcGISAuthenticationChallenge
  ) async throws -> ArcGISAuthenticationChallenge.Disposition {
    guard let username, let password else {
      return .continueWithoutCredential
    }
    let credential = try await TokenCredential.credential(
      for: challenge, username: username, password: password
    )
    return .continueWithCredential(credential)
  }
}
