import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

const inputVariants = cva('text-white w-full outline-none', {
  variants: {
    variant: {
      /** Standard rounded input with indigo focus ring */
      default:
        'bg-white/10 rounded-md focus:ring-2 focus:ring-indigo-400 placeholder-white/30',
      /** Subtle bordered input with dimmer focus */
      subtle:
        'bg-white/5 border border-white/10 rounded focus:border-white/30 placeholder-white/25',
    },
    size: {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-3 py-2 text-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size'> &
  VariantProps<typeof inputVariants>;

export const Input = ({ className, variant, size, ...props }: InputProps) => (
  <input
    className={cn(inputVariants({ variant, size }), className)}
    {...props}
  />
);
