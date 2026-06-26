import { View } from 'react-native';

import { cn } from '../../lib/utils';
import { Text } from './text';

export function Card({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('rounded-2xl border border-neutral-200 bg-white', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('gap-1 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-base font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-sm text-neutral-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('p-4 pt-0', className)} {...props} />;
}
