package expo.modules.arcgis

import com.arcgismaps.ArcGISEnvironment
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallenge
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallengeHandler
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallengeResponse
import com.arcgismaps.httpcore.authentication.OAuthUserConfiguration
import com.arcgismaps.httpcore.authentication.OAuthUserCredential
import com.arcgismaps.httpcore.authentication.OAuthUserSignIn
import com.arcgismaps.httpcore.authentication.TokenCredential
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Reactive token-auth handler — the pattern the docs recommend over pre-adding credentials by hand.
 * The SDK calls this whenever a secured resource needs credentials, passing the exact [challenge]
 * (URL / referer), so the right token is minted for the right resource at the right time.
 */
object AuthChallengeHandler : ArcGISAuthenticationChallengeHandler {
  private var username: String? = null
  private var password: String? = null
  private var tokenExpirationMinutes: Int? = null

  /**
   * Stores (or clears, when null) the login the handler uses to mint token credentials on demand.
   * [tokenExpirationMinutes] is forwarded to [TokenCredential.createWithChallenge]; pass null to
   * use the server's default expiry.
   */
  fun setCredentials(username: String?, password: String?, tokenExpirationMinutes: Int? = null) {
    this.username = username
    this.password = password
    this.tokenExpirationMinutes = tokenExpirationMinutes
  }

  override suspend fun handleArcGISAuthenticationChallenge(
    challenge: ArcGISAuthenticationChallenge,
  ): ArcGISAuthenticationChallengeResponse {
    val user = username ?: return ArcGISAuthenticationChallengeResponse.ContinueAndFail
    val pass = password ?: return ArcGISAuthenticationChallengeResponse.ContinueAndFail
    return TokenCredential.createWithChallenge(challenge, user, pass, tokenExpirationMinutes)
      .map { ArcGISAuthenticationChallengeResponse.ContinueWithCredential(it) }
      .getOrElse { ArcGISAuthenticationChallengeResponse.ContinueAndFail }
  }
}

/**
 * Drives an OAuth user sign-in across two JS calls (the SDK can't present a browser itself on
 * Android): `start` kicks off the flow and returns the authorize URL for JS to open in a browser;
 * `complete` finishes it with the redirect URL and caches the credential.
 */
object OAuthController {
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private var signIn: OAuthUserSignIn? = null
  private var completion: CompletableDeferred<Unit>? = null

  /** Starts the flow; resolves with the authorize URL once the SDK produces the sign-in request. */
  suspend fun start(portalUrl: String, clientId: String, redirectUrl: String): String {
    val configuration = OAuthUserConfiguration(portalUrl, clientId, redirectUrl)
    val authorizeUrl = CompletableDeferred<String>()
    scope.launch {
      OAuthUserCredential.create(configuration) { request ->
        signIn = request
        authorizeUrl.complete(request.authorizeUrl)
      }.onSuccess { credential ->
        ArcGISEnvironment.authenticationManager.arcGISCredentialStore.add(credential)
        completion?.complete(Unit)
      }.onFailure { error ->
        completion?.completeExceptionally(error)
      }
    }
    return authorizeUrl.await()
  }

  /** Completes the flow with the browser redirect URL; suspends until the credential is cached. */
  suspend fun complete(redirectUrl: String) {
    val done = CompletableDeferred<Unit>()
    completion = done
    signIn?.complete(redirectUrl)
    done.await()
  }
}
