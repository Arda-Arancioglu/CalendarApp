import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * Accessible switch card used for boolean event flags (`isFlexible`, `isPrivate`).
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
}: ToggleProps) {
  const id = useId();
  const descriptionId = `${id}-desc`;

  return (
    <div
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={cn(
        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors select-none',
        checked
          ? 'border-indigo-500/40 bg-indigo-500/10'
          : 'border-dark-border bg-dark-bg/50 hover:border-zinc-700',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon && (
          <span
            className={cn(
              'mt-0.5 shrink-0',
              checked ? 'text-indigo-300' : 'text-zinc-400',
            )}
          >
            {icon}
          </span>
        )}
        <div>
          <label
            htmlFor={id}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer text-sm font-medium text-zinc-100"
          >
            {label}
          </label>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-xs leading-relaxed text-zinc-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface',
          checked ? 'bg-indigo-500' : 'bg-zinc-700',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
