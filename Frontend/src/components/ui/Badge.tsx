import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'zinc' | 'red' | 'emerald';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'indigo', className }) => {
  const variantStyles = {
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    zinc: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    red: 'bg-red-950/80 text-red-300 border-red-800/60',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-xs select-none tracking-wide',
          variantStyles[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
