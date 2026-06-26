import { Link, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CATEGORIES, SAMPLES } from '../src/samples';

/** Home gallery — samples grouped by category, each a tappable card. */
export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'expo-arcgis' }} />
      <ScrollView className="flex-1 bg-neutral-100" contentContainerClassName="gap-6 p-4">
        {CATEGORIES.map((category) => (
          <View key={category} className="gap-2">
            <Text className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-500">{category}</Text>
            <View className="gap-2">
              {SAMPLES.filter((sample) => sample.category === category).map((sample) => (
                <Link key={sample.href} href={sample.href} asChild>
                  <Pressable className="rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50">
                    <Text className="text-base font-semibold text-neutral-900">{sample.title}</Text>
                    <Text className="mt-1 text-sm leading-5 text-neutral-500">{sample.description}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
