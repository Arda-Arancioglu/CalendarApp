import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, isValid, startOfMonth } from 'date-fns';
import { CalendarDays, Check, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { cn } from '../../utils/cn';
import { formatDate, fromApiDate, toApiDate } from '../../utils/date';
import {
  QUICK_SELECT_COUNTS,
  WEEKDAY_HEADERS,
  buildScopeRequestDTO,
  generateUpcomingOccurrenceDates,
  getEventOccurrenceDate,
  getMondayBasedOffset,
  type ScopeChoice,
} from '../../utils/recurrence';
import type { ApiDate } from '../../types/api';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
} from '../../types/event';

export type RecurrenceScopeAction = 'edit' | 'delete';

export interface RecurrenceCustomDatePickerProps {
  currentOccurrenceDate: ApiDate;
  upcomingOccurrences: ApiDate[];
  selectedDates: ApiDate[];
  onChangeSelectedDates: (dates: ApiDate[]) => void;
  variant?: 'indigo' | 'danger';
  disabled?: boolean;
}

/**
 * Reusable 3-month occurrence mini-calendar with Quick-Select [2 | 4 | 8 | 12] toolbar.
 * Used inline inside `EventFormModal` ("Custom dates...") and inside `RecurrenceScopeModal`.
 */
export function RecurrenceCustomDatePicker({
  currentOccurrenceDate,
  upcomingOccurrences,
  selectedDates,
  onChangeSelectedDates,
  variant = 'indigo',
  disabled = false,
}: RecurrenceCustomDatePickerProps) {
  const occurrenceSet = useMemo(() => new Set<ApiDate>(upcomingOccurrences), [upcomingOccurrences]);

  const [calendarMonths] = useState<Date[]>(() => {
    const base = fromApiDate(currentOccurrenceDate);
    const startMonth = startOfMonth(isValid(base) ? base : new Date());
    return [startMonth, addMonths(startMonth, 1), addMonths(startMonth, 2)];
  });

  const isDanger = variant === 'danger';

  const toggleDateSelection = (dateStr: ApiDate) => {
    const next = selectedDates.includes(dateStr)
      ? selectedDates.filter((d) => d !== dateStr)
      : [...selectedDates, dateStr].sort();
    onChangeSelectedDates(next);
  };

  const handleQuickSelect = (count: number) => {
    onChangeSelectedDates(upcomingOccurrences.slice(0, count));
  };

  return (
    <div className="space-y-3.5 rounded-xl border border-dark-border bg-dark-bg/60 p-4">
      {/* Quick-Select Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-border pb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
          <span>Select next</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_SELECT_COUNTS.map((count) => {
            const targetBatch = upcomingOccurrences.slice(0, count);
            const isBatchActive =
              targetBatch.length > 0 &&
              selectedDates.length === targetBatch.length &&
              targetBatch.every((d) => selectedDates.includes(d));

            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() => handleQuickSelect(count)}
                aria-label={`Select next ${count} occurrences`}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                  isBatchActive
                    ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
                    : 'border-dark-border bg-dark-surface text-zinc-300 hover:border-zinc-600 hover:text-zinc-100',
                )}
              >
                {count}
              </button>
            );
          })}
          <span className="text-xs text-zinc-400">occurrences</span>
          {selectedDates.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeSelectedDates([])}
              className="ml-1 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3-Month Mini-Calendar Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {calendarMonths.map((monthStart) => {
          const monthKey = format(monthStart, 'yyyy-MM');
          const daysInMonth = eachDayOfInterval({
            start: monthStart,
            end: endOfMonth(monthStart),
          });
          const leadingBlanks = getMondayBasedOffset(monthStart);

          return (
            <div
              key={monthKey}
              className="rounded-lg border border-dark-border/80 bg-dark-surface/70 p-2.5"
            >
              <div className="mb-2 flex items-center justify-center gap-1 text-xs font-semibold text-zinc-200">
                <CalendarDays className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span>{format(monthStart, 'MMM yyyy')}</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500">
                {WEEKDAY_HEADERS.map((wd) => (
                  <span key={wd}>{wd}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }).map((_, idx) => (
                  <span key={`blank-${idx}`} className="h-7 w-full" aria-hidden="true" />
                ))}

                {daysInMonth.map((dayDate) => {
                  const dateStr = toApiDate(dayDate);
                  const isOccurrence = occurrenceSet.has(dateStr);
                  const isPicked = selectedDates.includes(dateStr);

                  if (!isOccurrence) {
                    return (
                      <span
                        key={dateStr}
                        className="flex h-7 w-full items-center justify-center rounded-md text-[11px] text-zinc-600 select-none"
                      >
                        {format(dayDate, 'd')}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleDateSelection(dateStr)}
                      aria-label={`${isPicked ? 'Deselect' : 'Select'} occurrence ${dateStr}`}
                      aria-pressed={isPicked}
                      className={cn(
                        'flex h-7 w-full items-center justify-center rounded-md text-[11px] font-semibold transition-all',
                        isPicked
                          ? isDanger
                            ? 'bg-red-500 text-white shadow-xs ring-1 ring-red-300'
                            : 'bg-indigo-500 text-white shadow-xs ring-1 ring-indigo-300'
                          : 'border border-indigo-500/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/30',
                      )}
                    >
                      {format(dayDate, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected dates summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-zinc-400">
        <span>
          <strong className="font-semibold text-zinc-200">{selectedDates.length}</strong>{' '}
          {selectedDates.length === 1 ? 'occurrence' : 'occurrences'} selected
        </span>
        {selectedDates.length > 0 && (
          <div className="flex max-w-full flex-wrap gap-1">
            {selectedDates.slice(0, 6).map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-md bg-dark-elevated px-2 py-0.5 font-mono text-[11px] text-zinc-200"
              >
                <Check className="h-2.5 w-2.5 text-indigo-400" aria-hidden="true" />
                {d}
              </span>
            ))}
            {selectedDates.length > 6 && (
              <span className="rounded-md bg-dark-elevated px-2 py-0.5 text-[11px] text-zinc-400">
                +{selectedDates.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface RecurrenceScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: RecurrenceScopeAction;
  event: EventResponseDTO | null;
  /** Full event payload when editing (`mode === 'edit'`). */
  updateData?: EventRequestDTO | null;
  onConfirm: (scopePayload: EventScopeRequestDTO) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

interface ScopeModalBodyProps {
  onClose: () => void;
  mode: RecurrenceScopeAction;
  event: EventResponseDTO;
  updateData?: EventRequestDTO | null;
  onConfirm: (scopePayload: EventScopeRequestDTO) => Promise<void> | void;
  isLoading: boolean;
  errorMessage?: string | null;
}

function ScopeModalBody({
  onClose,
  mode,
  event,
  updateData,
  onConfirm,
  isLoading,
  errorMessage,
}: ScopeModalBodyProps) {
  const currentOccurrenceDate = useMemo(() => getEventOccurrenceDate(event), [event]);
  const upcomingOccurrences = useMemo(
    () => generateUpcomingOccurrenceDates(event, 3, 12),
    [event],
  );

  const [choice, setChoice] = useState<ScopeChoice>('THIS_ONLY');
  const [selectedDates, setSelectedDates] = useState<ApiDate[]>(() => [currentOccurrenceDate]);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLocalError(null);

    if (choice === 'CUSTOM' && selectedDates.length === 0) {
      setLocalError('Please select at least one occurrence date.');
      return;
    }

    const dto = buildScopeRequestDTO(
      choice,
      currentOccurrenceDate,
      selectedDates,
      mode === 'edit' ? updateData : null,
    );
    await onConfirm(dto);
  };

  const isDelete = mode === 'delete';
  const actionVerb = isDelete ? 'Delete' : 'Update';

  const confirmButtonLabel =
    choice === 'CUSTOM'
      ? `${actionVerb} ${selectedDates.length} selected occurrences`
      : isDelete
        ? 'Delete'
        : 'Save changes';

  const options: {
    id: ScopeChoice;
    label: string;
    description: string;
  }[] = [
    {
      id: 'THIS_ONLY',
      label: 'This event only',
      description: `Only ${isDelete ? 'delete' : 'update'} the occurrence on ${formatDate(currentOccurrenceDate)}.`,
    },
    {
      id: 'THIS_AND_FOLLOWING',
      label: 'This and all following events',
      description: `${actionVerb} ${formatDate(currentOccurrenceDate)} and all future occurrences.`,
    },
    {
      id: 'ALL',
      label: 'All events in series',
      description: `${actionVerb} every occurrence in this recurring series.`,
    },
    {
      id: 'CUSTOM',
      label: 'Custom (Pick dates to delete/edit)',
      description: 'Pick specific occurrences from the next 3 months or batch-select with one click.',
    },
  ];

  return (
    <div className="space-y-4">
      {(errorMessage || localError) && (
        <Alert variant="error">{errorMessage ?? localError}</Alert>
      )}

      <p className="text-sm text-zinc-300">
        <span className="font-semibold text-zinc-100">{event.title}</span> is a recurring event.
        Which occurrences would you like to {isDelete ? 'delete' : 'update'}?
      </p>

      {/* 4 Radio Cards */}
      <div role="radiogroup" aria-label="Recurrence scope options" className="space-y-2.5">
        {options.map((opt) => {
          const isSelected = choice === opt.id;
          return (
            <label
              key={opt.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors select-none',
                isSelected
                  ? isDelete
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-indigo-500/50 bg-indigo-500/10'
                  : 'border-dark-border bg-dark-bg/50 hover:border-zinc-700',
                isLoading && 'pointer-events-none opacity-60',
              )}
            >
              <input
                type="radio"
                name="recurrence-scope"
                value={opt.id}
                checked={isSelected}
                disabled={isLoading}
                onChange={() => {
                  setLocalError(null);
                  setChoice(opt.id);
                }}
                className="mt-1 h-4 w-4 accent-indigo-500"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-100">{opt.label}</div>
                <div className="mt-0.5 text-xs text-zinc-400">{opt.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Custom Mini-Calendar & Quick-Select Toolbar */}
      {choice === 'CUSTOM' && (
        <RecurrenceCustomDatePicker
          currentOccurrenceDate={currentOccurrenceDate}
          upcomingOccurrences={upcomingOccurrences}
          selectedDates={selectedDates}
          onChangeSelectedDates={(next) => {
            setLocalError(null);
            setSelectedDates(next);
          }}
          variant={isDelete ? 'danger' : 'indigo'}
          disabled={isLoading}
        />
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 border-t border-dark-border pt-4">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant={isDelete ? 'danger' : 'primary'}
          onClick={() => void handleConfirm()}
          isLoading={isLoading}
          disabled={choice === 'CUSTOM' && selectedDates.length === 0}
        >
          {confirmButtonLabel}
        </Button>
      </div>
    </div>
  );
}

export function RecurrenceScopeModal({
  isOpen,
  onClose,
  mode,
  event,
  updateData,
  onConfirm,
  isLoading = false,
  errorMessage = null,
}: RecurrenceScopeModalProps) {
  if (!event) return null;

  const title =
    mode === 'delete' ? 'Delete recurring event' : 'Edit recurring event';
  const bodyKey = `${mode}-${event.occurrenceId ?? event.eventId}-${event.startTime}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="xl">
      {isOpen && (
        <ScopeModalBody
          key={bodyKey}
          onClose={onClose}
          mode={mode}
          event={event}
          updateData={updateData}
          onConfirm={onConfirm}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
    </Modal>
  );
}
