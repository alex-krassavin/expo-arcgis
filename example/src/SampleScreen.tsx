import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from '../components/ui/text';

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
    <View className="flex-1">
      {children}
      {(status != null || controls != null) && (
        <View className="absolute inset-x-0 bottom-0 gap-3 border-t border-neutral-200 bg-white/95 px-4 pb-7 pt-3">
          {status != null && <Text className="text-sm leading-5 text-neutral-700">{status}</Text>}
          {controls != null && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2">
              {controls}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
