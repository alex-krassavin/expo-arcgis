package expo.modules.arcgis

import com.arcgismaps.httpcore.authentication.NetworkAuthenticationChallenge
import com.arcgismaps.httpcore.authentication.NetworkAuthenticationChallengeHandler
import com.arcgismaps.httpcore.authentication.NetworkAuthenticationChallengeResponse
import com.arcgismaps.httpcore.authentication.NetworkAuthenticationType
import com.arcgismaps.httpcore.authentication.ServerTrust

/**
 * Network-layer trust handler that accepts every server-trust challenge unconditionally.
 * Only install this for development or on-prem ArcGIS Enterprise with self-signed certificates —
 * it disables TLS certificate validation, which makes the connection vulnerable to
 * man-in-the-middle attacks. Never enable in production.
 */
object NetworkTrustHandler : NetworkAuthenticationChallengeHandler {
  override suspend fun handleNetworkAuthenticationChallenge(
    challenge: NetworkAuthenticationChallenge,
  ): NetworkAuthenticationChallengeResponse {
    if (challenge.networkAuthenticationType is NetworkAuthenticationType.ServerTrust) {
      return NetworkAuthenticationChallengeResponse.ContinueWithCredential(ServerTrust)
    }
    return NetworkAuthenticationChallengeResponse.Cancel
  }
}
