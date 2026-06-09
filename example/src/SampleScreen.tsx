import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Shared chrome for interactive samples: renders the map/scene full-screen with an optional
 * floating bar of controls and a status line. Static samples can render the map directly.
 */
export function SampleScreen({
  status,
  controls,
  children,
}: {
  status?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.fill}>
      {children}
      {(status != null || controls != null) && (
        <View style={styles.bar}>
          {status != null && <Text style={styles.status}>{status}</Text>}
          {controls != null && <View style={styles.controls}>{controls}</View>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  status: { fontSize: 13, color: '#1d3557' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
