import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        /** Indigo filled — primary call-to-action */
        primary:
          'bg-indigo-500 hover:bg-indigo-400 text-white font-medium disabled:opacity-40',
        /** Subtle white/10 background — secondary actions */
        secondary: 'bg-white/10 text-white/50 hover:bg-white/20',
        /** Transparent nav-style — requires `active` prop for colours */
        ghost: '',
        /** Pill tab inside a tab-group container — requires `active` prop */
        tab: 'font-medium',
        /** Underline-style tab — requires `active` prop */
        tabUnderline: 'border-b-2 -mb-px',
        /** Rounded-full chip / filter — requires `active` prop */
        chip: 'rounded-full',
        /** Toggleable selection (indigo when on) — requires `active` prop */
        toggle: '',
        /** Bordered toggle (blue when on) — requires `active` prop */
        toggleOutline: 'border',
        /** Circular muted icon button */
        icon: 'rounded-full text-white/60 hover:text-white hover:bg-white/15 disabled:opacity-30',
        /** Circular blue icon button */
        iconPrimary:
          'rounded-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30',
        /** Circular delete/danger icon button */
        danger: 'rounded-full bg-black/60 hover:bg-red-500 text-white',
        /** Plain blue text link */
        link: 'text-blue-400 hover:text-blue-300',
        /** Muted text link */
        linkMuted: 'text-white/40 hover:text-white/60',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs gap-1',
        sm: 'px-2.5 py-1 text-sm gap-1.5 rounded',
        md: 'px-3 py-1.5 text-sm gap-2 rounded-md',
        nav: 'px-2.5 py-2 text-sm gap-3 rounded-lg',
        lg: 'px-4 py-2.5 gap-2 rounded-lg',
        icon: 'w-8 h-8',
        iconSm: 'p-1',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'ghost',
        active: true,
        class: 'bg-(--nav-active-bg) text-(--nav-active-color)',
      },
      {
        variant: 'ghost',
        active: false,
        class:
          'text-(--nav-inactive-color) hover:bg-(--nav-hover-bg) hover:text-(--nav-hover-color)',
      },
      { variant: 'tab', active: true, class: 'bg-white/15 text-white' },
      {
        variant: 'tab',
        active: false,
        class: 'text-white/40 hover:text-white/70',
      },
      {
        variant: 'tabUnderline',
        active: true,
        class: 'border-blue-400 text-white',
      },
      {
        variant: 'tabUnderline',
        active: false,
        class: 'border-transparent text-white/40 hover:text-white/70',
      },
      { variant: 'chip', active: true, class: 'bg-white/20 text-white' },
      {
        variant: 'chip',
        active: false,
        class: 'text-white/40 hover:text-white/70',
      },
      { variant: 'toggle', active: true, class: 'bg-indigo-500 text-white' },
      {
        variant: 'toggle',
        active: false,
        class: 'bg-white/10 text-white/50 hover:bg-white/20',
      },
      {
        variant: 'toggleOutline',
        active: true,
        class: 'bg-blue-500/30 border-blue-400 text-blue-200',
      },
      {
        variant: 'toggleOutline',
        active: false,
        class: 'border-white/15 text-white/50 hover:border-white/30',
      },
    ],
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

type ButtonProps = ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants>;

export const Button = ({
  className,
  variant,
  size,
  active,
  ...props
}: ButtonProps) => (
  <button
    type="button"
    className={cn(buttonVariants({ variant, size, active }), className)}
    {...props}
  />
);

type LinkButtonProps = ComponentPropsWithoutRef<'a'> &
  VariantProps<typeof buttonVariants>;

export const LinkButton = ({
  className,
  variant,
  size,
  active,
  ...props
}: LinkButtonProps) => (
  <a
    className={cn(buttonVariants({ variant, size, active }), className)}
    {...props}
  />
);
