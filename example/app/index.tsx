import { Link, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES, SAMPLES } from '../src/samples';

/** Home gallery — a branded hero over samples grouped into tappable cards. */
export default function Home() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} className="flex-1 bg-neutral-100">
        <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-3">
          <View className="gap-1 px-1">
            <Text className="text-3xl font-extrabold tracking-tight text-neutral-900">expo-arcgis</Text>
            <Text className="text-sm text-neutral-500">
              ArcGIS Maps SDK for React Native · {SAMPLES.length} samples
            </Text>
          </View>
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
      </SafeAreaView>
    </>
  );
}
