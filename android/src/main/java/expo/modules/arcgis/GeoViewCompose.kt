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
 *
 * Every child fills the view, stacked in order: the ComposeView, and above it the layer of a geo
 * view's React children ([ReactChildrenLayer]). ExpoView's LinearLayout would lay them out in a row.
 */
abstract class ComposeHostView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val width = MeasureSpec.getSize(widthMeasureSpec)
    val height = MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(width, height)
    if (!isAttachedToWindow) {
      return
    }
    val childWidthSpec = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY)
    val childHeightSpec = MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
    for (i in 0 until childCount) {
      getChildAt(i).measure(childWidthSpec, childHeightSpec)
    }
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    for (i in 0 until childCount) {
      getChildAt(i).layout(0, 0, r - l, b - t)
    }
  }
}

/**
 * Holds a `<MapView>` / `<SceneView>`'s React children, above the map. Fabric inserts them by index
 * and positions each one itself; as the view's own children they would sit under the map, and its
 * ComposeHostView layout would stretch them over it. The module routes them here instead
 * (`reactChildrenAboveMap` in ExpoArcgisModule). Like React Native's own views, this layer leaves its
 * children where Fabric puts them, and it handles no touches: those that hit no child reach the map.
 */
internal class ReactChildrenLayer(context: Context) : ViewGroup(context) {
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = Unit
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
