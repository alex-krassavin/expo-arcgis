import { Link, Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, SAMPLES } from '../src/samples';

/** Home gallery — samples grouped by category. */
export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'expo-arcgis' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {CATEGORIES.map((category) => (
          <View key={category} style={styles.section}>
            <Text style={styles.heading}>{category}</Text>
            {SAMPLES.filter((sample) => sample.category === category).map((sample) => (
              <View key={sample.href} style={styles.row}>
                <Link href={sample.href} style={styles.title}>
                  {sample.title}
                </Link>
                <Text style={styles.description}>{sample.description}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  section: { marginBottom: 24 },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6e6e73',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d1d6',
  },
  title: { fontSize: 17, color: '#0079c1' },
  description: { fontSize: 13, color: '#6e6e73', marginTop: 2 },
});
