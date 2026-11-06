import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xs animate-fade-in sm:items-center sm:p-4"
    >
      {/* Overlay click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container: bottom sheet on phones, centered dialog on larger screens */}
      <div
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-dark-border bg-dark-surface text-zinc-100 shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl',
          maxWidthClasses[maxWidth],
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dark-border bg-dark-elevated/60 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2
            id="modal-title"
            className="min-w-0 truncate text-base font-semibold tracking-tight text-zinc-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
