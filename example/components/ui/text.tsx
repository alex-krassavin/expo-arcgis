import { createContext, useContext } from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '../../lib/utils';

/** Lets a parent (e.g. Button) set the default text classes for its children. */
export const TextClassContext = createContext<string | undefined>(undefined);

export function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  const context = useContext(TextClassContext);
  return <RNText className={cn('text-base text-neutral-900', context, className)} {...props} />;
}
