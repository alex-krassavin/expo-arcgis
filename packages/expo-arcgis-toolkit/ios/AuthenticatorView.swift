import ArcGIS
import ArcGISToolkit
import ExpoArcgis
import ExpoModulesCore
import SwiftUI

/// The Toolkit's `Authenticator`. While the view is mounted, the authenticator handles the app's
/// authentication challenges in place of expo-arcgis's handlers, and its prompts (sign-in, trusting
/// a host, picking a certificate) present from the screen the view is in. The view shows nothing
/// itself.
final class AuthenticatorView: ExpoView {
  private let model = AuthenticatorModel()
  private var hostingController: UIHostingController<AuthenticatorContent>?
  private let takeover = ChallengeHandlerTakeover()

  private var promptForUntrustedHosts = false
  private var oAuthUserConfigurations: [OAuthUserConfiguration] = []
  private var iapConfigurations: [IAPConfiguration] = []
  private var setAsArcGISHandler = true
  private var setAsNetworkHandler = true

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    let hostingController = UIHostingController(rootView: AuthenticatorContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.frame = bounds
    hostingController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(hostingController.view)
    self.hostingController = hostingController
  }

  // The prompts present from the hosting controller, which needs a parent for that.
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let hostingController { updateHostingControllerParent(hostingController) }
  }

  // The prompts are gone with the view: hand the challenges back.
  deinit {
    takeover.handBack()
  }

  func setPromptForUntrustedHosts(_ value: Bool?) { promptForUntrustedHosts = value ?? false }
  func setAsArcGISHandler(_ value: Bool?) { setAsArcGISHandler = value ?? true }
  func setAsNetworkHandler(_ value: Bool?) { setAsNetworkHandler = value ?? true }

  func setOAuthUserConfigurations(_ items: [[String: Any]]?) {
    oAuthUserConfigurations = items?.compactMap(oAuthUserConfiguration(from:)) ?? []
  }

  func setIapConfigurations(_ items: [[String: Any]]?) {
    iapConfigurations = items?.compactMap { item in
      do {
        return try iapConfiguration(from: item)
      } catch {
        log.error("[expo-arcgis-toolkit] <Authenticator> left out an IAP configuration: \(error)")
        return nil
      }
    } ?? []
  }

  /// Applies the props, once React has set them all.
  func update() {
    // An authenticator prompts for untrusted hosts or not for its whole life.
    if model.authenticator == nil || model.promptsForUntrustedHosts != promptForUntrustedHosts {
      model.authenticator = Authenticator(promptForUntrustedHosts: promptForUntrustedHosts)
      model.promptsForUntrustedHosts = promptForUntrustedHosts
    }
    guard let authenticator = model.authenticator else { return }
    authenticator.oAuthUserConfigurations = oAuthUserConfigurations
    authenticator.iapConfigurations = iapConfigurations
    takeover.take(authenticator, arcGIS: setAsArcGISHandler, network: setAsNetworkHandler)
  }

  /// The Toolkit's sign-out: revokes the OAuth tokens, invalidates the IAP credentials, and clears
  /// both credential stores.
  func signOut() async {
    await ArcGISEnvironment.authenticationManager.signOut()
  }
}

@MainActor
final class AuthenticatorModel: ObservableObject {
  @Published var authenticator: Authenticator?
  var promptsForUntrustedHosts = false
}

struct AuthenticatorContent: View {
  @ObservedObject var model: AuthenticatorModel

  var body: some View {
    if let authenticator = model.authenticator {
      // A new authenticator starts with prompts of its own.
      Color.clear
        .authenticator(authenticator)
        .id(ObjectIdentifier(authenticator))
    } else {
      Color.clear
    }
  }
}

/// Puts an authenticator in the place of the app's challenge handlers (expo-arcgis's), and hands
/// them back.
final class ChallengeHandlerTakeover: @unchecked Sendable {
  private var replacedArcGISHandler: (any ArcGISAuthenticationChallengeHandler)?
  private var replacedNetworkHandler: (any NetworkAuthenticationChallengeHandler)?
  /// The authenticator in place, for the handlers it took.
  private var current: AnyObject?

  /// Makes the authenticator the handler of the ArcGIS challenges, the network ones, or both; it
  /// hands back those it no longer takes.
  @MainActor
  func take(_ authenticator: Authenticator, arcGIS: Bool, network: Bool) {
    let manager = ArcGISEnvironment.authenticationManager
    if arcGIS {
      if !isCurrent(manager.arcGISAuthenticationChallengeHandler) {
        replacedArcGISHandler = manager.arcGISAuthenticationChallengeHandler
      }
      manager.arcGISAuthenticationChallengeHandler = authenticator
    } else if isCurrent(manager.arcGISAuthenticationChallengeHandler) {
      manager.arcGISAuthenticationChallengeHandler = replacedArcGISHandler
      replacedArcGISHandler = nil
    }
    if network {
      if !isCurrent(manager.networkAuthenticationChallengeHandler) {
        replacedNetworkHandler = manager.networkAuthenticationChallengeHandler
      }
      manager.networkAuthenticationChallengeHandler = authenticator
    } else if isCurrent(manager.networkAuthenticationChallengeHandler) {
      manager.networkAuthenticationChallengeHandler = replacedNetworkHandler
      replacedNetworkHandler = nil
    }
    current = authenticator
  }

  /// Hands back the handlers the authenticator took. One that the app replaced since stays.
  func handBack() {
    let manager = ArcGISEnvironment.authenticationManager
    if isCurrent(manager.arcGISAuthenticationChallengeHandler) {
      manager.arcGISAuthenticationChallengeHandler = replacedArcGISHandler
    }
    if isCurrent(manager.networkAuthenticationChallengeHandler) {
      manager.networkAuthenticationChallengeHandler = replacedNetworkHandler
    }
    current = nil
  }

  private func isCurrent(_ handler: Any?) -> Bool {
    guard let current, let handler else { return false }
    return (handler as AnyObject) === current
  }
}

/// An OAuth user configuration from its JS form (`OAuthUserConfiguration` in Authenticator.tsx).
private func oAuthUserConfiguration(from item: [String: Any]) -> OAuthUserConfiguration? {
  guard let portalURL = url(item["portalUrl"]),
        let clientID = item["clientId"] as? String,
        let redirectURL = url(item["redirectUrl"])
  else { return nil }
  return OAuthUserConfiguration(
    portalURL: portalURL,
    clientID: clientID,
    redirectURL: redirectURL,
    refreshTokenExpirationInterval: refreshTokenExpirationInterval(item["refreshTokenExpirationInterval"]),
    refreshTokenExchangeInterval: refreshTokenExchangeInterval(item["refreshTokenExchangeInterval"]),
    federatedTokenExpirationMinutes: (item["federatedTokenExpirationMinutes"] as? NSNumber)?.intValue,
    showCancelButton: item["showCancelButton"] as? Bool ?? true,
    userInterfaceStyle: userInterfaceStyle(item["userInterfaceStyle"] as? String),
    prefersPrivateWebBrowserSession: item["prefersPrivateWebBrowserSession"] as? Bool ?? false
  )
}

/// An IAP configuration from its JS form: a Microsoft Entra tenant, or the provider's endpoints.
private func iapConfiguration(from item: [String: Any]) throws -> IAPConfiguration? {
  guard let clientID = item["clientId"] as? String, let redirectURL = url(item["redirectUrl"]) else {
    return nil
  }
  let hostsBehindProxy = item["hostsBehindProxy"] as? [String] ?? []
  let prompt = iapAuthorizationPromptType(item["authorizationPromptType"] as? String)
  if let tenantID = item["tenantId"] as? String {
    return try .microsoft(
      tenantID: tenantID,
      clientID: clientID,
      redirectURL: redirectURL,
      hostsBehindProxy: hostsBehindProxy,
      authorizationPromptType: prompt
    )
  }
  guard let authorizeURL = url(item["authorizeUrl"]),
        let tokenURL = url(item["tokenUrl"]),
        let logoutURL = url(item["logoutUrl"])
  else { return nil }
  return try .configuration(
    authorizeURL: authorizeURL,
    tokenURL: tokenURL,
    logoutURL: logoutURL,
    clientID: clientID,
    redirectURL: redirectURL,
    scopes: item["scopes"] as? [String] ?? [],
    hostsBehindProxy: hostsBehindProxy,
    authorizationPromptType: prompt,
    clientSecret: item["clientSecret"] as? String ?? "",
    iapClientID: item["iapClientId"] as? String ?? ""
  )
}

private func url(_ value: Any?) -> URL? {
  (value as? String).flatMap(URL.init(string:))
}

private func minutes(_ value: Any?) -> Int? {
  ((value as? [String: Any])?["minutes"] as? NSNumber)?.intValue
}

private func refreshTokenExpirationInterval(
  _ value: Any?
) -> OAuthUserConfiguration.RefreshTokenExpirationInterval {
  if let minutes = minutes(value) { return .minutes(minutes) }
  return value as? String == "maximum" ? .maximum : .default
}

private func refreshTokenExchangeInterval(
  _ value: Any?
) -> OAuthUserConfiguration.RefreshTokenExchangeInterval {
  if let minutes = minutes(value) { return .minutes(minutes) }
  return value as? String == "never" ? .never : .minutes(1440)
}

private func userInterfaceStyle(_ name: String?) -> UIUserInterfaceStyle {
  switch name {
  case "light": return .light
  case "dark": return .dark
  default: return .unspecified
  }
}

private func iapAuthorizationPromptType(_ name: String?) -> IAPAuthorizationPromptType? {
  switch name {
  case "noPrompt": return .noPrompt
  case "login": return .login
  case "consent": return .consent
  case "selectAccount": return .selectAccount
  default: return nil
  }
}
