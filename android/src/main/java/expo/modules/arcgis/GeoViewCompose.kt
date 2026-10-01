package expo.modules.arcgis

import android.content.Context
import android.view.ViewGroup
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy

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
 * (the Toolkit's composable MapView or SceneView) until [ComposeView.disposeComposition].
 */
internal fun geoViewComposeHost(context: Context, content: @Composable () -> Unit): ComposeView =
  ComposeView(context).apply {
    layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    setViewCompositionStrategy(DisposeOnViewDestroyed)
    setContent(content)
  }
