package expo.modules.arcgistoolkit

import android.content.Context
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.arcgismaps.data.ArcGISFeature
import com.arcgismaps.mapping.featureforms.FeatureForm
import com.arcgismaps.toolkit.featureforms.FeatureFormEditingEvent
import com.arcgismaps.toolkit.featureforms.FeatureFormState
import com.arcgismaps.toolkit.featureforms.ValidationErrorVisibility
import expo.modules.arcgis.ComposeHostView
import expo.modules.arcgis.FeatureRef
import expo.modules.arcgis.geoViewComposeHost
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import com.arcgismaps.toolkit.featureforms.FeatureForm as FeatureFormComposable

/**
 * The Toolkit's `FeatureForm` for a feature from a view's `identify` (expo-arcgis's `FeatureRef`):
 * the form its layer defines, with the Toolkit's own save and discard actions.
 */
class FeatureFormPanelView(context: Context, appContext: AppContext) : ComposeHostView(context, appContext) {
  private val onDismiss by EventDispatcher<Map<String, Any?>>()
  private val onEditingEvent by EventDispatcher<Map<String, Any?>>()

  private var featureForm by mutableStateOf<FeatureForm?>(null)
  private var showCloseIcon by mutableStateOf(true)
  private var showFormActions by mutableStateOf(true)
  private var navigationEnabled by mutableStateOf(true)
  private var validationErrors by mutableStateOf<ValidationErrorVisibility>(ValidationErrorVisibility.Automatic)

  private val composeView = geoViewComposeHost(context) { Content() }.also { addView(it) }

  /** Receives the feature to edit, and makes its form. Only a feature table's features have one. */
  fun setFeature(ref: FeatureRef?) {
    featureForm = (ref?.feature as? ArcGISFeature)?.let { FeatureForm(it) }
  }

  /** The Toolkit's defaults show the close icon and the form actions, and allow navigation. */
  fun setShowCloseIcon(value: Boolean?) {
    showCloseIcon = value ?: true
  }

  fun setShowFormActions(value: Boolean?) {
    showFormActions = value ?: true
  }

  fun setNavigationEnabled(value: Boolean?) {
    navigationEnabled = value ?: true
  }

  fun setValidationErrorVisibility(value: String?) {
    validationErrors =
      if (value == "visible") ValidationErrorVisibility.Visible else ValidationErrorVisibility.Automatic
  }

  @Composable
  private fun Content() {
    val featureForm = featureForm ?: return
    val scope = rememberCoroutineScope()
    // A new form, a new state: it takes its form when it is made.
    val state = remember(featureForm) { FeatureFormState(featureForm, scope) }
    FeatureFormComposable(
      featureFormState = state,
      modifier = Modifier.fillMaxSize(),
      showCloseIcon = showCloseIcon,
      showFormActions = showFormActions,
      isNavigationEnabled = navigationEnabled,
      validationErrorVisibility = validationErrors,
      onDismiss = { onDismiss(emptyMap()) },
      onEditingEvent = { event ->
        when (event) {
          is FeatureFormEditingEvent.SavedEdits ->
            onEditingEvent(mapOf("type" to "savedEdits", "willNavigate" to event.willNavigate))
          is FeatureFormEditingEvent.DiscardedEdits ->
            onEditingEvent(mapOf("type" to "discardedEdits", "willNavigate" to event.willNavigate))
        }
      },
    )
  }

  /** Releases the composition once React unmounts the view (OnViewDestroys). */
  fun destroy() {
    composeView.disposeComposition()
    removeView(composeView)
  }
}
