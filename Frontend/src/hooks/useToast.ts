import { useContext } from 'react';
import { ToastContext, type ToastApi } from '../context/ToastContext';

/** Show toasts from any component: `const toast = useToast(); toast.success('Saved')`. */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
