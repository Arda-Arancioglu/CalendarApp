import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: ReactNode;
  /** Element rendered inside the input on the right (e.g. a show-password button). */
  rightSlot?: ReactNode;
}

/**
 * Labelled text input. Uses forwardRef so react-hook-form's `register()` can attach to it.
 * The error/helper text is linked with aria-describedby for screen readers.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, rightSlot, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasMessage = Boolean(error || helperText);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            'h-10 w-full rounded-lg border bg-dark-bg/70 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500',
            'focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/30'
              : 'border-dark-border focus:border-indigo-400 focus:ring-indigo-500/30',
            rightSlot ? 'pr-10' : undefined,
            className,
          )}
          {...props}
        />
        {rightSlot && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{rightSlot}</div>}
      </div>
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

/** Input with a show/hide toggle for passwords. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightSlot'>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="rounded-md p-2 text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
