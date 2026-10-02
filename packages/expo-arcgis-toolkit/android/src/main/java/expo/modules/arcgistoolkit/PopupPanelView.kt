package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import com.arcgismaps.mapping.popup.Popup
import com.arcgismaps.toolkit.popup.PopupState
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.PopupRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlinx.coroutines.flow.drop
import com.arcgismaps.toolkit.popup.Popup as PopupComposable

/**
 * The Toolkit's `Popup` for a popup from a view's `identifyPopups` (expo-arcgis's `PopupRef`): its
 * fields, media, attachments and related records, with expressions evaluated.
 */
class PopupPanelView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private val onDismiss by EventDispatcher<Map<String, Any?>>()
  private val onPopupChange by EventDispatcher<Map<String, Any?>>()

  private var popup by mutableStateOf<Popup?>(null)
  private var showCloseIcon by mutableStateOf(true)

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  fun setPopup(ref: PopupRef?) {
    popup = ref?.popup
  }

  /** The Toolkit's default shows the close icon. */
  fun setShowCloseIcon(value: Boolean?) {
    showCloseIcon = value ?: true
  }

  @Composable
  private fun Content() {
    val popup = popup ?: return
    val scope = rememberCoroutineScope()
    // A new popup, a new state: it takes its root popup when it is made.
    val state = remember(popup) { PopupState(popup, scope) }
    LaunchedEffect(state) {
      // Navigating utility network associations shows another popup.
      snapshotFlow { state.activePopup }.drop(1).collect { onPopupChange(mapOf("title" to it.title)) }
    }
    PopupComposable(
      popupState = state,
      modifier = Modifier.fillMaxSize(),
      onDismiss = { onDismiss(emptyMap()) },
      showCloseIcon = showCloseIcon,
    )
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}
