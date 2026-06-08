package expo.modules.arcgis

import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallenge
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallengeHandler
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallengeResponse
import com.arcgismaps.httpcore.authentication.TokenCredential

/**
 * Reactive token-auth handler — the pattern the docs recommend over pre-adding credentials by hand.
 * The SDK calls this whenever a secured resource needs credentials, passing the exact [challenge]
 * (URL / referer), so the right token is minted for the right resource at the right time.
 */
object AuthChallengeHandler : ArcGISAuthenticationChallengeHandler {
  private var username: String? = null
  private var password: String? = null

  /** Stores (or clears, when null) the login the handler uses to mint token credentials on demand. */
  fun setCredentials(username: String?, password: String?) {
    this.username = username
    this.password = password
  }

  override suspend fun handleArcGISAuthenticationChallenge(
    challenge: ArcGISAuthenticationChallenge,
  ): ArcGISAuthenticationChallengeResponse {
    val user = username ?: return ArcGISAuthenticationChallengeResponse.ContinueAndFail
    val pass = password ?: return ArcGISAuthenticationChallengeResponse.ContinueAndFail
    return TokenCredential.create(challenge.requestUrl, user, pass)
      .map { ArcGISAuthenticationChallengeResponse.ContinueWithCredential(it) }
      .getOrElse { ArcGISAuthenticationChallengeResponse.ContinueAndFail }
  }
}
