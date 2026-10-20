import { useEffect, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ToastItem, ToastKind } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

const DEFAULT_DURATION: Record<ToastKind, number> = { success: 4000, info: 4000, error: 7000 };

const icons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-indigo-300" aria-hidden="true" />,
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  // Auto-dismiss after the duration. Toasts with an action stay a bit longer.
  useEffect(() => {
    const duration = toast.durationMs ?? DEFAULT_DURATION[toast.kind] + (toast.action ? 3000 : 0);
    const timerId = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timerId);
  }, [toast, onDismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-dark-elevated/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-md animate-toast-in',
        toast.kind === 'error' ? 'border-red-500/30' : 'border-dark-border',
      )}
    >
      <span className="mt-0.5 shrink-0">{icons[toast.kind]}</span>
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold text-zinc-100">{toast.title}</p>}
        <p className="break-words text-sm text-zinc-300">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200 focus-visible:underline focus-visible:outline-none"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-dark-hover hover:text-zinc-200"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Renders the toast stack: bottom-center on phones, bottom-right on larger screens. */
export function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}
