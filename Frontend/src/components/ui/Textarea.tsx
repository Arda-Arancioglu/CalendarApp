import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: ReactNode;
}

/**
 * Labelled textarea that integrates with react-hook-form (`forwardRef`).
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, className, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const hasMessage = Boolean(error || helperText);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasMessage ? messageId : undefined}
        className={cn(
          'w-full rounded-lg border bg-dark-bg/70 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500',
          'focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
          error
            ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/30'
            : 'border-dark-border focus:border-indigo-400 focus:ring-indigo-500/30',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={messageId} className="text-xs font-medium text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <div id={messageId} className="text-xs text-zinc-400">
          {helperText}
        </div>
      ) : null}
    </div>
  );
});
