import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function splitTime24(raw: string | undefined | null): { hour: string; minute: string } {
  if (!raw) return { hour: '09', minute: '00' };
  const match = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!match) return { hour: '09', minute: '00' };
  const h = Math.max(0, Math.min(23, Number.parseInt(match[1] ?? '9', 10)));
  const m = Math.max(0, Math.min(59, Number.parseInt(match[2] ?? '0', 10)));
  return {
    hour: String(h).padStart(2, '0'),
    minute: String(m).padStart(2, '0'),
  };
}

function splitDateTime24(raw: string | undefined | null): {
  date: string;
  hour: string;
  minute: string;
} {
  if (!raw) return { date: '', hour: '09', minute: '00' };
  const [datePart = '', timePart = '09:00'] = raw.trim().split('T');
  const { hour, minute } = splitTime24(timePart);
  return { date: datePart, hour, minute };
}

export interface Time24InputProps {
  label?: string;
  value: string;
  onChange: (nextTime24: string) => void;
  error?: string;
  helperText?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Strict 24-hour (`00:00` – `23:59`) time picker.
 * Never uses native `<input type="time">` so 12-hour AM/PM never appears in any OS locale.
 */
export function Time24Input({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  className,
  id,
}: Time24InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasMessage = Boolean(error || helperText);

  const { hour, minute } = splitTime24(value);

  const handleHourChange = (nextHour: string) => {
    onChange(`${nextHour}:${minute}`);
  };

  const handleMinuteChange = (nextMinute: string) => {
    onChange(`${hour}:${nextMinute}`);
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex h-11 sm:h-10.5 w-full items-center justify-between gap-1.5 rounded-xl border bg-dark-bg/70 px-3 text-sm text-zinc-100 transition-colors',
          'focus-within:ring-2',
          disabled && 'cursor-not-allowed opacity-60',
          error
            ? 'border-red-500/70 focus-within:border-red-400 focus-within:ring-red-500/30'
            : 'border-dark-border focus-within:border-indigo-400 focus-within:ring-indigo-500/30',
        )}
      >
        {/* Synchronized accessible text input for label association & direct 24h typing */}
        <input
          id={inputId}
          type="text"
          disabled={disabled}
          value={`${hour}:${minute}`}
          onChange={(e) => {
            const raw = e.target.value;
            if (/^\d{2}:\d{2}$/.test(raw)) {
              const parsed = splitTime24(raw);
              onChange(`${parsed.hour}:${parsed.minute}`);
            }
          }}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
        />

        <div className="flex items-center gap-1 font-mono text-sm">
          <select
            aria-label="Hour"
            disabled={disabled}
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            className="cursor-pointer rounded-md bg-transparent px-1.5 py-1 font-mono text-xs sm:text-sm text-zinc-100 focus:bg-dark-elevated focus:outline-none"
          >
            {HOURS_24.map((h) => (
              <option key={h} value={h} className="bg-dark-surface text-zinc-100">
                {h}
              </option>
            ))}
          </select>
          <span className="font-bold text-zinc-400">:</span>
          <select
            aria-label="Minutes"
            disabled={disabled}
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="cursor-pointer rounded-md bg-transparent px-1.5 py-1 font-mono text-xs sm:text-sm text-zinc-100 focus:bg-dark-elevated focus:outline-none"
          >
            {MINUTES_60.map((m) => (
              <option key={m} value={m} className="bg-dark-surface text-zinc-100">
                {m}
              </option>
            ))}
          </select>
        </div>

        <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
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
}

export interface DateTime24InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: ReactNode;
  watchedValue?: string;
}

/**
 * Strict 24-hour Date + Time (`YYYY-MM-DDTHH:mm`) input.
 * Replaces `<input type="datetime-local">` so AM/PM never appears in any OS locale,
 * while remaining 100% compatible with `react-hook-form`'s `register()` and Testing Library.
 */
export const DateTime24Input = forwardRef<HTMLInputElement, DateTime24InputProps>(
  function DateTime24Input(
    { label, error, helperText, watchedValue, className, id, onChange, disabled, ...props },
    forwardedRef,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = `${inputId}-message`;
    const hasMessage = Boolean(error || helperText);
    const innerRef = useRef<HTMLInputElement | null>(null);

    const initialRaw =
      typeof watchedValue === 'string'
        ? watchedValue
        : typeof props.value === 'string'
          ? props.value
          : typeof props.defaultValue === 'string'
            ? props.defaultValue
            : '';

    const [internalVal, setInternalVal] = useState<string>(initialRaw);
    const effectiveValue = typeof watchedValue === 'string' ? watchedValue : internalVal;

    const { date, hour, minute } = splitDateTime24(effectiveValue);

    const emitCombinedValue = (nextCombined: string) => {
      setInternalVal(nextCombined);
      const inputEl = innerRef.current;
      if (inputEl) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeSetter?.call(inputEl, nextCombined);
      }
      if (onChange) {
        const syntheticEvent = {
          target: {
            name: props.name ?? '',
            value: nextCombined,
          },
          currentTarget: {
            name: props.name ?? '',
            value: nextCombined,
          },
        } as unknown as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleDirectInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
      onChange?.(e);
    };

    return (
      <div className={cn('w-full space-y-1.5', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-zinc-300">
            {label}
          </label>
        )}

        {/* Underlying form input linked to label & react-hook-form register() */}
        <input
          {...props}
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === 'function') {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          id={inputId}
          type="text"
          disabled={disabled}
          onChange={handleDirectInputChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className="sr-only"
        />

        <div
          className={cn(
            'flex h-11 sm:h-10.5 w-full items-center justify-between gap-2 rounded-xl border bg-dark-bg/70 px-3 text-sm text-zinc-100 transition-colors',
            'focus-within:ring-2',
            disabled && 'cursor-not-allowed opacity-60',
            error
              ? 'border-red-500/70 focus-within:border-red-400 focus-within:ring-red-500/30'
              : 'border-dark-border focus-within:border-indigo-400 focus-within:ring-indigo-500/30',
          )}
        >
          <input
            type="date"
            aria-label="Date"
            disabled={disabled}
            value={date}
            onChange={(e) => {
              const nextDate = e.target.value;
              if (nextDate) {
                emitCombinedValue(`${nextDate}T${hour}:${minute}`);
              }
            }}
            className="min-w-0 flex-1 h-9 bg-transparent text-xs text-zinc-100 focus:outline-none sm:text-sm"
          />

          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-dark-border/80 bg-dark-surface/90 px-2.5 py-1 font-mono text-xs text-zinc-100 sm:text-sm">
            <select
              aria-label="Hour"
              disabled={disabled}
              value={hour}
              onChange={(e) => {
                if (date) emitCombinedValue(`${date}T${e.target.value}:${minute}`);
              }}
              className="cursor-pointer bg-transparent font-mono text-xs text-zinc-100 focus:bg-dark-elevated focus:outline-none sm:text-sm"
            >
              {HOURS_24.map((h) => (
                <option key={h} value={h} className="bg-dark-surface text-zinc-100">
                  {h}
                </option>
              ))}
            </select>
            <span className="font-bold text-zinc-400">:</span>
            <select
              aria-label="Minutes"
              disabled={disabled}
              value={minute}
              onChange={(e) => {
                if (date) emitCombinedValue(`${date}T${hour}:${e.target.value}`);
              }}
              className="cursor-pointer bg-transparent font-mono text-xs text-zinc-100 focus:bg-dark-elevated focus:outline-none sm:text-sm"
            >
              {MINUTES_60.map((m) => (
                <option key={m} value={m} className="bg-dark-surface text-zinc-100">
                  {m}
                </option>
              ))}
            </select>
          </div>
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
  },
);
