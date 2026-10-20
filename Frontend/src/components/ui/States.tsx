import type { ReactNode } from 'react';
import { AlertOctagon, SearchX } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { ApiError, getErrorMessage } from '../../utils/errors';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly placeholder for empty lists ("No squads yet"). */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-dark-border bg-dark-surface/40 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/** Error placeholder for a failed query. 404s get a friendlier "not found" look. */
export function ErrorState({ error, onRetry, isRetrying, className }: ErrorStateProps) {
  const isNotFound = error instanceof ApiError && error.status === 404;
  return (
    <EmptyState
      className={className}
      icon={isNotFound ? <SearchX className="h-6 w-6" /> : <AlertOctagon className="h-6 w-6" />}
      title={isNotFound ? 'Not found' : 'Something went wrong'}
      description={
        isNotFound ? "This doesn't exist anymore, or you don't have access to it." : getErrorMessage(error)
      }
      action={
        onRetry && !isNotFound ? (
          <Button variant="secondary" onClick={onRetry} isLoading={isRetrying}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}
