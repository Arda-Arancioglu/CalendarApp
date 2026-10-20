import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi, type ToastItem, type ToastKind, type ToastOptions } from './ToastContext';
import { Toaster } from '../components/ui/Toaster';

/** Keeps the list of visible toasts and exposes success/error/info helpers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts((current) => {
      // Don't stack identical messages (e.g. 3 queries failing at once while offline).
      if (current.some((toast) => toast.kind === kind && toast.message === message)) return current;
      // Keep at most 4 on screen.
      return [...current, { id, kind, message, ...options }].slice(-4);
    });
  }, []);

  // useMemo keeps this object stable, so consumers (like the QueryClient,
  // which is created once) never hold a stale reference.
  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
