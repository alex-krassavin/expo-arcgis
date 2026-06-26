import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable } from 'react-native';

import { cn } from '../../lib/utils';
import { Text } from './text';
import { TextClassContext } from './text';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-xl', {
  variants: {
    variant: {
      default: 'bg-blue-600 active:bg-blue-700',
      secondary: 'bg-neutral-200 active:bg-neutral-300',
      outline: 'border border-neutral-300 bg-white active:bg-neutral-100',
      ghost: 'active:bg-neutral-100',
      destructive: 'bg-red-600 active:bg-red-700',
    },
    size: { default: 'h-11 px-5', sm: 'h-9 px-3', lg: 'h-12 px-6' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

const buttonTextVariants = cva('text-sm font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-neutral-900',
      outline: 'text-neutral-900',
      ghost: 'text-neutral-900',
      destructive: 'text-white',
    },
    size: { default: '', sm: '', lg: 'text-base' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Convenience: render a styled label. Equivalent to passing a `<Text>` child. */
    title?: string;
  };

export function Button({ className, variant, size, title, children, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {title != null ? <Text>{title}</Text> : children}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { buttonVariants };
