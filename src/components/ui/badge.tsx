import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-white/50',
        /** Muted count label — no background */
        count: 'text-white/30',
        error: 'bg-red-500/30 text-red-300',
        success: 'bg-green-500/10 text-green-300',
        warning: 'bg-yellow-500/10 text-yellow-200',
      },
      size: {
        xs: 'text-[10px] px-1.5 py-0.5',
        sm: 'text-xs px-2 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

type BadgeProps = ComponentPropsWithoutRef<'span'> &
  VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, size, ...props }: BadgeProps) => (
  <span
    className={cn(badgeVariants({ variant, size }), className)}
    {...props}
  />
);
