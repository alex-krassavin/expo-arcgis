package expo.modules.arcgistoolkit

import android.content.Context
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.arcgismaps.ArcGISEnvironment
import com.arcgismaps.httpcore.authentication.ArcGISAuthenticationChallengeHandler
import com.arcgismaps.httpcore.authentication.IapAuthorizationPromptType
import com.arcgismaps.httpcore.authentication.IapConfiguration
import com.arcgismaps.httpcore.authentication.NetworkAuthenticationChallengeHandler
import com.arcgismaps.httpcore.authentication.OAuthUserConfiguration
import com.arcgismaps.httpcore.authentication.RefreshTokenExchangeInterval
import com.arcgismaps.httpcore.authentication.RefreshTokenExpirationInterval
import com.arcgismaps.toolkit.authentication.AuthenticatorState
import com.arcgismaps.toolkit.authentication.DialogAuthenticator
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import java.util.Locale

/**
 * The Toolkit's `DialogAuthenticator`. While the view is mounted, its `AuthenticatorState` handles
 * the app's authentication challenges in place of expo-arcgis's handlers. It prompts in dialogs, and
 * opens OAuth and IAP sign-ins in a Custom Tab (the Toolkit's `AuthenticationActivity`, which the
 * config plugin declares for `oAuthRedirectUris`). The view shows nothing itself.
 */
class AuthenticatorView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private var state by mutableStateOf<AuthenticatorState?>(null)

  private var oAuthUserConfigurations: List<OAuthUserConfiguration> = emptyList()
  private var iapConfigurations: List<IapConfiguration> = emptyList()
  private var setAsArcGISHandler = true
  private var setAsNetworkHandler = true

  /** The challenge handlers the state took the place of: it hands them back. */
  private var replacedArcGISHandler: ArcGISAuthenticationChallengeHandler? = null
  private var replacedNetworkHandler: NetworkAuthenticationChallengeHandler? = null

  private val composeView = geoViewComposeHost(context) {
    state?.let { DialogAuthenticator(it) }
  }.also { addView(it) }

  fun setOAuthUserConfigurations(items: List<Map<String, Any?>>?) {
    oAuthUserConfigurations = items?.mapNotNull(::oAuthUserConfiguration) ?: emptyList()
  }

  fun setIapConfigurations(items: List<Map<String, Any?>>?) {
    iapConfigurations = items?.mapNotNull { item ->
      runCatching { iapConfiguration(item) }
        .onFailure { Log.e(TAG, "<Authenticator> left out an IAP configuration", it) }
        .getOrNull()
    } ?: emptyList()
  }

  fun setAsArcGISHandler(value: Boolean?) {
    setAsArcGISHandler = value ?: true
  }

  fun setAsNetworkHandler(value: Boolean?) {
    setAsNetworkHandler = value ?: true
  }

  /** Applies the props, once React has set them all. */
  fun update() {
    // The state takes the handlers here rather than when it's made, to keep those it replaces.
    val state = state ?: AuthenticatorState(
      setAsArcGISAuthenticationChallengeHandler = false,
      setAsNetworkAuthenticationChallengeHandler = false,
    ).also { this.state = it }
    state.oAuthUserConfigurations = oAuthUserConfigurations
    state.iapConfigurations = iapConfigurations
    val manager = ArcGISEnvironment.authenticationManager
    if (setAsArcGISHandler) {
      if (manager.arcGISAuthenticationChallengeHandler !== state) {
        replacedArcGISHandler = manager.arcGISAuthenticationChallengeHandler
        manager.arcGISAuthenticationChallengeHandler = state
      }
    } else if (manager.arcGISAuthenticationChallengeHandler === state) {
      manager.arcGISAuthenticationChallengeHandler = replacedArcGISHandler
      replacedArcGISHandler = null
    }
    if (setAsNetworkHandler) {
      if (manager.networkAuthenticationChallengeHandler !== state) {
        replacedNetworkHandler = manager.networkAuthenticationChallengeHandler
        manager.networkAuthenticationChallengeHandler = state
      }
    } else if (manager.networkAuthenticationChallengeHandler === state) {
      manager.networkAuthenticationChallengeHandler = replacedNetworkHandler
      replacedNetworkHandler = null
    }
  }

  /**
   * The Toolkit's sign-out: revokes the OAuth tokens, signs out of the IAPs (in a Custom Tab), and
   * clears both credential stores.
   */
  suspend fun signOut() {
    state?.signOut()?.getOrThrow()
  }

  fun dismissAll() {
    state?.dismissAll()
  }

  /**
   * Once React unmounts the view: cancels the prompts it shows, hands the challenges back (those the
   * app hasn't given to another handler since), and releases the composition.
   */
  fun destroy() {
    state?.let { state ->
      state.dismissAll()
      val manager = ArcGISEnvironment.authenticationManager
      if (manager.arcGISAuthenticationChallengeHandler === state) {
        manager.arcGISAuthenticationChallengeHandler = replacedArcGISHandler
      }
      if (manager.networkAuthenticationChallengeHandler === state) {
        manager.networkAuthenticationChallengeHandler = replacedNetworkHandler
      }
    }
    composeView.disposeComposition()
    removeView(composeView)
  }

  private companion object {
    const val TAG = "expo-arcgis-toolkit"
  }
}

/** An OAuth user configuration from its JS form (`OAuthUserConfiguration` in Authenticator.tsx). */
private fun oAuthUserConfiguration(item: Map<String, Any?>): OAuthUserConfiguration? {
  val portalUrl = item["portalUrl"] as? String ?: return null
  val clientId = item["clientId"] as? String ?: return null
  val redirectUrl = item["redirectUrl"] as? String ?: return null
  return OAuthUserConfiguration(
    portalUrl = portalUrl,
    clientId = clientId,
    redirectUrl = redirectUrl,
    culture = Locale.getDefault(),
    refreshTokenExpirationInterval = minutes(item["refreshTokenExpirationInterval"])
      ?.let { RefreshTokenExpirationInterval.Minutes(it) }
      ?: if (item["refreshTokenExpirationInterval"] == "maximum") RefreshTokenExpirationInterval.Maximum
      else RefreshTokenExpirationInterval.Default,
    refreshTokenExchangeInterval = minutes(item["refreshTokenExchangeInterval"])
      ?.let { RefreshTokenExchangeInterval.Minutes(it) }
      ?: if (item["refreshTokenExchangeInterval"] == "never") RefreshTokenExchangeInterval.Never
      else RefreshTokenExchangeInterval.Minutes(1440),
    federatedTokenExpirationInterval = (item["federatedTokenExpirationMinutes"] as? Number)?.toInt(),
    showCancelButton = item["showCancelButton"] as? Boolean ?: true,
    userInterfaceStyle = when (item["userInterfaceStyle"]) {
      "light" -> OAuthUserConfiguration.UserInterfaceStyle.Light
      "dark" -> OAuthUserConfiguration.UserInterfaceStyle.Dark
      else -> OAuthUserConfiguration.UserInterfaceStyle.Unspecified
    },
    preferPrivateWebBrowserSession = item["prefersPrivateWebBrowserSession"] as? Boolean ?: false,
  )
}

/** An IAP configuration from its JS form: a Microsoft Entra tenant, or the provider's endpoints. */
private fun iapConfiguration(item: Map<String, Any?>): IapConfiguration? {
  val clientId = item["clientId"] as? String ?: return null
  val redirectUrl = item["redirectUrl"] as? String ?: return null
  val hostsBehindProxy = (item["hostsBehindProxy"] as? List<*>)?.filterIsInstance<String>() ?: emptyList()
  val prompt = when (item["authorizationPromptType"]) {
    "noPrompt" -> IapAuthorizationPromptType.None
    "login" -> IapAuthorizationPromptType.Login
    "consent" -> IapAuthorizationPromptType.Consent
    "selectAccount" -> IapAuthorizationPromptType.SelectAccount
    else -> IapAuthorizationPromptType.Unspecified
  }
  val tenantId = item["tenantId"] as? String
  if (tenantId != null) {
    return IapConfiguration.createForMicrosoft(tenantId, clientId, redirectUrl, hostsBehindProxy, prompt)
  }
  return IapConfiguration.create(
    item["authorizeUrl"] as? String ?: return null,
    item["tokenUrl"] as? String ?: return null,
    item["logoutUrl"] as? String ?: return null,
    clientId,
    redirectUrl,
    (item["scopes"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
    hostsBehindProxy,
    prompt,
    item["clientSecret"] as? String ?: "",
    item["iapClientId"] as? String ?: "",
  )
}

private fun minutes(value: Any?): Int? = ((value as? Map<*, *>)?.get("minutes") as? Number)?.toInt()
