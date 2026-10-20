import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Screen-reader text. */
  label?: string;
}

const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex">
      <span
        aria-hidden="true"
        className={cn(
          'animate-spin rounded-full border-current border-t-transparent opacity-80',
          sizes[size],
          className,
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Centered spinner that fills the screen, used while the session is being checked. */
export function FullScreenLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-indigo-400">
      <Spinner size="lg" label={label} />
    </div>
  );
}
