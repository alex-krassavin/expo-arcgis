import { portal, type PortalItemInfo } from 'expo-arcgis';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { SampleScreen } from '../../src/SampleScreen';

/** Searches ArcGIS Online anonymously for Esri web maps and lists them. */
export default function PortalSearch() {
  const [items, setItems] = useState<PortalItemInfo[]>([]);
  const [status, setStatus] = useState('Searching ArcGIS Online…');

  useEffect(() => {
    portal
      .findItems({ query: 'type:"Web Map" owner:esri', max: 20 })
      .then((r) => {
        setItems(r);
        setStatus(`${r.length} web maps found`);
      })
      .catch((e) => setStatus(String(e)));
  }, []);

  return (
    <SampleScreen status={status}>
      <ScrollView style={{ flex: 1, padding: 12 }}>
        {items.map((it) => (
          <Text key={it.id} style={{ paddingVertical: 6, fontSize: 13 }}>
            {it.title} · {it.type}
          </Text>
        ))}
      </ScrollView>
    </SampleScreen>
  );
}
