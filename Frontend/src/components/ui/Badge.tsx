import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'indigo' | 'zinc' | 'red' | 'emerald' | 'amber' | 'sky';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30',
  zinc: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/25',
  red: 'bg-red-500/15 text-red-200 ring-red-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
};

export function Badge({ children, variant = 'indigo', className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex select-none items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
