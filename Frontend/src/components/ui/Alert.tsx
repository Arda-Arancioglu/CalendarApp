import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, { box: string; icon: ReactNode }> = {
  error: {
    box: 'border-red-500/30 bg-red-500/10 text-red-200',
    icon: <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />,
  },
  warning: {
    box: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />,
  },
  success: {
    box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />,
  },
  info: {
    box: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-100',
    icon: <Info className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />,
  },
};

/** Inline message box (form-level errors, notices). Errors are announced by screen readers. */
export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const style = styles[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-3.5 py-3 text-sm', style.box, className)}
    >
      <span className="mt-0.5">{style.icon}</span>
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
