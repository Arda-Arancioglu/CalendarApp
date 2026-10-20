import { createContext } from 'react';

/**
 * Context object + types for toasts. The provider lives in ToastProvider.tsx
 * and components use the `useToast()` hook. (They are split into separate files
 * so React Fast Refresh keeps working: a .tsx file should only export components.)
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  action?: ToastAction;
  /** Auto-dismiss delay. Defaults: 4s (success/info), 7s (error). */
  durationMs?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
