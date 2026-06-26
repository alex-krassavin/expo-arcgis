import { KmlLayer, Scene, SceneView, type Camera, type KmlLayerHandle, type Surface } from 'expo-arcgis';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';

const ELEVATION: Surface = {
  elevationSources: [
    { url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer' },
  ],
};

const START: Camera = { position: { x: -112.12, y: 35.95, z: 5000 }, heading: 10, pitch: 72, roll: 0 };

// A minimal KML document whose only content is a `gx:Tour` — a smooth fly-through of the Grand Canyon.
// KML tours are not common in public feeds, so the document is written to a local file at runtime.
const KML_TOUR = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>Grand Canyon Tour</name>
    <gx:Tour>
      <name>Fly the Canyon</name>
      <gx:Playlist>
        <gx:FlyTo><gx:duration>4</gx:duration><gx:flyToMode>smooth</gx:flyToMode>
          <Camera><longitude>-112.12</longitude><latitude>36.0</latitude><altitude>4500</altitude><heading>20</heading><tilt>75</tilt></Camera>
        </gx:FlyTo>
        <gx:FlyTo><gx:duration>5</gx:duration><gx:flyToMode>smooth</gx:flyToMode>
          <Camera><longitude>-112.25</longitude><latitude>36.1</latitude><altitude>3500</altitude><heading>80</heading><tilt>80</tilt></Camera>
        </gx:FlyTo>
        <gx:FlyTo><gx:duration>5</gx:duration><gx:flyToMode>smooth</gx:flyToMode>
          <Camera><longitude>-112.4</longitude><latitude>36.25</latitude><altitude>3000</altitude><heading>140</heading><tilt>78</tilt></Camera>
        </gx:FlyTo>
      </gx:Playlist>
    </gx:Tour>
  </Document>
</kml>`;

/**
 * A KML tour is a scripted camera fly-through. `<KmlLayer>` exposes `playTour` / `pauseTour` /
 * `resetTour` on its ref; the tour auto-starts once the layer's nodes have loaded.
 *
 * NOTE: tour playback is **iOS-only** — on Android the view-based scene view can't be driven by the
 * KML tour controller (an ArcGIS SDK limitation). The buttons are present but no-op on Android.
 */
export default function KmlTour() {
  const [layer, setLayer] = useState<KmlLayerHandle | null>(null);
  const [kmlUri, setKmlUri] = useState<string | null>(null);

  useEffect(() => {
    const dest = `${FileSystem.cacheDirectory}tour.kml`;
    FileSystem.writeAsStringAsync(dest, KML_TOUR).then(() => setKmlUri(dest));
  }, []);

  useEffect(() => {
    if (!layer) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    // Load the KML first (so the tour node is discoverable on slower devices), then let the scene
    // view settle before auto-starting the tour.
    layer
      .getNodes()
      .then(() => {
        if (alive) timer = setTimeout(() => layer.playTour(), 2500);
      })
      .catch(() => {});
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [layer]);

  return (
    <Scene basemap="arcGISImagery" surface={ELEVATION}>
      <SceneView style={{ flex: 1 }} camera={START}>
        {kmlUri && <KmlLayer ref={setLayer} url={kmlUri} />}
      </SceneView>
      <View style={styles.controls}>
        <Button title="Play" onPress={() => layer?.playTour()} />
        <Button title="Pause" onPress={() => layer?.pauseTour()} />
        <Button title="Reset" onPress={() => layer?.resetTour()} />
      </View>
    </Scene>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
