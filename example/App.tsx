import { StyleSheet, Text, View } from 'react-native';

import * as Arcgis from 'arcgis';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{Arcgis.hello()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
