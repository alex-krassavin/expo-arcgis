import ArcGIS
import ExpoModulesCore

/// An `ImageOverlay` that displays a single georeferenced image frame — a local image file shown at a
/// map extent, with adjustable opacity. Added to a `<MapView>` via the `<ImageOverlay>` component.
public final class ImageOverlayRef: SharedObject {
  let overlay = ImageOverlay()

  /// Sets the displayed frame from a local image file path and its geographic extent (clears on nil).
  func setFrame(_ imagePath: String, _ extent: [String: Any], _ opacity: Double?) {
    var dict = extent
    dict["type"] = "envelope"
    guard let image = UIImage(contentsOfFile: imagePath),
          let envelope = geometryFromDict(dict) as? Envelope else {
      overlay.imageFrame = nil
      return
    }
    overlay.imageFrame = ImageFrame(image: image, extent: envelope)
    if let opacity { overlay.opacity = Float(opacity) }
  }

  func setOpacity(_ opacity: Double) { overlay.opacity = Float(opacity) }
}
