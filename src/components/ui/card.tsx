import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

const cardVariants = cva('border border-white/10', {
  variants: {
    rounded: {
      md: 'rounded-lg',
      xl: 'rounded-xl',
    },
    padding: {
      none: '',
      sm: 'px-3 py-2.5',
      md: 'px-4 py-3',
      lg: 'p-3',
      xl: 'p-6',
    },
  },
  defaultVariants: {
    rounded: 'md',
    padding: 'md',
  },
});

type CardProps = ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof cardVariants>;

export const Card = ({ className, rounded, padding, ...props }: CardProps) => (
  <div
    className={cn(cardVariants({ rounded, padding }), className)}
    {...props}
  />
);
