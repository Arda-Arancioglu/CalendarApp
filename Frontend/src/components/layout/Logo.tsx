import { CalendarDays } from 'lucide-react';
import { cn } from '../../utils/cn';

/** App logo: gradient tile + wordmark. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50 ring-1 ring-white/10">
        <CalendarDays className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-zinc-50">
          Event<span className="text-indigo-300">Flow</span>
        </span>
      )}
    </span>
  );
}
