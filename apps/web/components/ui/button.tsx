import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// shadcn/ui composition pattern; adapted to the local workspace theme.
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:pointer-events-none disabled:opacity-50 h-11 px-5',
  {
    variants: {
      variant: {
        default: 'bg-teal-800 text-white hover:bg-teal-900',
        outline: 'border border-stone-300 bg-white hover:bg-stone-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}
