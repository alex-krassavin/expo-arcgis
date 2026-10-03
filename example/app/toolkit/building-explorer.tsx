import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LocalSceneView, Scene, type LocalSceneViewHandle } from 'expo-arcgis';
import { BuildingExplorer, type BuildingExplorerSelection } from 'expo-arcgis-toolkit';

// Esri's local web scene with Building E, as in the Toolkit's building explorer example.
const LOCAL_WEB_SCENE_ID = 'b7c387d599a84a50aafaece5ca139d44';

/**
 * The ArcGIS Toolkit's building explorer below a local scene, bound to the `<LocalSceneView>`
 * through its ref: pick a level to see it with the ones above hidden, browse phases and
 * categories. iOS only; on Android it renders nothing.
 */
export default function BuildingExplorerSample() {
  const view = useRef<LocalSceneViewHandle>(null);
  const [selection, setSelection] = useState<BuildingExplorerSelection | null>(null);
  const label = selection
    ? [selection.layer, selection.level && `level ${selection.level}`].filter(Boolean).join(' · ')
    : 'Pick a level';
  return (
    <View style={{ flex: 1 }}>
      <Scene portalItem={{ itemId: LOCAL_WEB_SCENE_ID }}>
        <LocalSceneView ref={view} style={{ flex: 1 }}>
          <View style={styles.banner} pointerEvents="none">
            <Text style={styles.text}>{label}</Text>
          </View>
        </LocalSceneView>
      </Scene>
      <BuildingExplorer geoView={view} onSelectionChange={setSelection} style={styles.explorer} />
    </View>
  );
}

const styles = StyleSheet.create({
  explorer: { height: 360, backgroundColor: 'white' },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  text: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
});
