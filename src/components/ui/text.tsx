import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '../../lib/utils';

const textVariants = cva('', {
  variants: {
    variant: {
      /** Page / section title */
      heading: 'text-lg font-semibold text-white',
      /** Section group label — e.g. "Months", "Canvas size" */
      label: 'text-xs text-white/50 font-medium',
      /** Normal body copy */
      body: 'text-sm text-white/70',
      /** Secondary / supporting label */
      caption: 'text-sm text-white/50',
      /** Dim helper text, fine print */
      hint: 'text-xs text-white/30',
      /** Slightly less dim secondary text */
      muted: 'text-xs text-white/40',
      /** Monospace display value — amounts, codes */
      value: 'text-sm font-mono text-white',
      /** Small monospace — dim secondary value */
      'value-muted': 'text-xs font-mono text-white/30',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

type TextVariantProps = VariantProps<typeof textVariants>;

type TextProps<T extends ElementType = 'span'> = {
  as?: T;
} & TextVariantProps &
  Omit<ComponentPropsWithoutRef<T>, keyof TextVariantProps | 'as'>;

export const Text = <T extends ElementType = 'span'>({
  as,
  variant,
  className,
  ...props
}: TextProps<T>) => {
  const Tag = (as ?? 'span') as ElementType;
  return (
    <Tag className={cn(textVariants({ variant }), className)} {...props} />
  );
};
