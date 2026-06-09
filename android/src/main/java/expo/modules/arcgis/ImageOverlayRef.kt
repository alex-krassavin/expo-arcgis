package expo.modules.arcgis

import com.arcgismaps.geometry.Envelope
import com.arcgismaps.mapping.view.ImageFrame
import com.arcgismaps.mapping.view.ImageOverlay
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject

/**
 * An [ImageOverlay] that displays a single georeferenced image frame — a local image file shown at a
 * map extent, with adjustable opacity. Added to a `<MapView>` via the `<ImageOverlay>` component.
 */
class ImageOverlayRef(appContext: AppContext) : SharedObject(appContext) {
  val overlay = ImageOverlay()

  /** Sets the displayed frame from a local image file path and its geographic extent (clears on null). */
  fun setFrame(imagePath: String, extent: Map<String, Any?>, opacity: Double?) {
    val envelope = geometryFromDict(extent + ("type" to "envelope")) as? Envelope
    if (envelope == null) {
      overlay.imageFrame = null
      return
    }
    overlay.imageFrame = ImageFrame(imagePath, envelope)
    opacity?.let { overlay.opacity = it.toFloat() }
  }

  fun setOpacity(opacity: Double) { overlay.opacity = opacity.toFloat() }
}
