package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * An Expo view whose content is a [ComposeView] (see [geoViewComposeHost]).
 *
 * Fabric measures a view before it attaches it to a window. A ComposeView creates its composition on
 * its first measure and needs the window's recomposer for that: measured while detached, it throws
 * "Cannot locate windowRecomposer". So until the view is attached it takes the size it is given
 * without measuring the ComposeView. Android layout (`shouldUseAndroidLayout`) then measures it for
 * real: attaching makes the ComposeView request a layout, which React Native wouldn't run itself.
 * This is what expo-modules-core's own ExpoComposeView does.
 */
abstract class ComposeHostView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    if (!isAttachedToWindow) {
      setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
      return
    }
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)
  }
}

/**
 * Keeps a geo view's composition — and with it the GeoView — until React destroys the view, which
 * disposes it from `OnViewDestroys`. Compose's default strategy disposes on detach, but
 * react-native-screens also detaches screens it is about to show again: the map would be destroyed
 * with its viewpoint and rebuilt on every return to the screen.
 */
private object DisposeOnViewDestroyed : ViewCompositionStrategy {
  override fun installFor(view: AbstractComposeView): () -> Unit = {}
}

/**
 * The Compose host for a `<MapView>` / `<SceneView>`: fills the React view and renders [content]
 * (the Toolkit's composable MapView or SceneView) until [ComposeView.disposeComposition]. Public for
 * the views of packages built on expo-arcgis (expo-arcgis-toolkit's panels), which dispose the same way.
 */
fun geoViewComposeHost(context: Context, content: @Composable () -> Unit): ComposeView =
  ComposeView(context).apply {
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    setViewCompositionStrategy(DisposeOnViewDestroyed)
    setContent(content)
  }
