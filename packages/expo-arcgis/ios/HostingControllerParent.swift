import SwiftUI
import UIKit

extension UIView {
  /// Keeps the hosting controller whose view this view shows a child of the screen's view
  /// controller while this view is in a window, and detaches it once the view leaves. A detached
  /// hosting controller can't present: the sheets, popovers and alerts of its SwiftUI content (the
  /// toolkit's floor filter, basemap gallery…) would never show. Call it from `didMoveToWindow()`.
  ///
  /// As a child, the hosting controller would also inset its content by the safe area. It doesn't:
  /// the content fills the frame React Native lays out, and the app keeps the safe area clear, as
  /// for any other view.
  ///
  /// The screen's view controller is the first one up the responder chain, as React Native's
  /// `reactViewController` finds it. A navigation or tab bar controller takes only screens as
  /// children, so under one the hosting controller stays detached.
  public func updateHostingControllerParent<Content: View>(
    _ hostingController: UIHostingController<Content>
  ) {
    hostingController.safeAreaRegions = []
    let parent = window == nil ? nil : nearestViewController
    guard hostingController.parent !== parent else { return }
    if hostingController.parent != nil {
      hostingController.willMove(toParent: nil)
      hostingController.removeFromParent()
    }
    guard let parent, !(parent is UINavigationController), !(parent is UITabBarController) else {
      return
    }
    parent.addChild(hostingController)
    hostingController.didMove(toParent: parent)
  }

  private var nearestViewController: UIViewController? {
    var responder = next
    while let current = responder {
      if let viewController = current as? UIViewController {
        return viewController
      }
      responder = current.next
    }
    return nil
  }
}
