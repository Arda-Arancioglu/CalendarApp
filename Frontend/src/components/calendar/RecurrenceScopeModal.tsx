import { useId, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, isValid, startOfMonth } from 'date-fns';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  Minus,
  Sparkles,
} from 'lucide-react';
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
  event?: EventResponseDTO;
  currentOccurrenceDate: ApiDate;
  upcomingOccurrences?: ApiDate[];
  selectedDates: ApiDate[];
  onChangeSelectedDates: (dates: ApiDate[]) => void;
  variant?: 'indigo' | 'danger';
  disabled?: boolean;
}

const INITIAL_MONTHS_TO_SHOW = 3;
const MONTHS_STEP = 3;
const MAX_MONTHS_TO_SHOW = 24;

/**
 * Interactive multi-month occurrence selector with:
 * - Custom number input ("Select next N occurrences") + quick preset buttons [2 | 4 | 8 | 12]
 * - Per-month select-all tick / checkbox in each month header
 * - "Show more months" / "Show fewer months" pagination
 */
export function RecurrenceCustomDatePicker({
  event,
  currentOccurrenceDate,
  upcomingOccurrences: externalOccurrences,
  selectedDates,
  onChangeSelectedDates,
  variant = 'indigo',
  disabled = false,
}: RecurrenceCustomDatePickerProps) {
  const countInputId = useId();
  const [monthsToShow, setMonthsToShow] = useState<number>(INITIAL_MONTHS_TO_SHOW);
  const [customCountInput, setCustomCountInput] = useState<string>('');

  // Generate occurrences dynamically across all visible months (and enough for custom count)
  const parsedCount = Number.parseInt(customCountInput, 10);
  const minOccurrencesNeeded =
    Number.isInteger(parsedCount) && parsedCount > 12 ? Math.min(parsedCount, 365) : 12;

  const computedOccurrences = useMemo<ApiDate[]>(() => {
    if (event) {
      return generateUpcomingOccurrenceDates(event, monthsToShow, minOccurrencesNeeded);
    }
    return externalOccurrences ?? [];
  }, [event, externalOccurrences, monthsToShow, minOccurrencesNeeded]);

  const occurrenceSet = useMemo(
    () => new Set<ApiDate>(computedOccurrences),
    [computedOccurrences],
  );

  const [baseMonthStart] = useState<Date>(() => {
    const base = fromApiDate(currentOccurrenceDate);
    return startOfMonth(isValid(base) ? base : new Date());
  });

  const calendarMonths = useMemo<Date[]>(() => {
    return Array.from({ length: monthsToShow }, (_, i) => addMonths(baseMonthStart, i));
  }, [baseMonthStart, monthsToShow]);

  const isDanger = variant === 'danger';

  const toggleDateSelection = (dateStr: ApiDate) => {
    const next = selectedDates.includes(dateStr)
      ? selectedDates.filter((d) => d !== dateStr)
      : [...selectedDates, dateStr].sort();
    setCustomCountInput(String(next.length));
    onChangeSelectedDates(next);
  };

  const applyOccurrenceCount = (count: number) => {
    const clamped = Math.max(0, Math.min(count, 365));
    const pool = event
      ? generateUpcomingOccurrenceDates(event, Math.max(monthsToShow, 6), Math.max(12, clamped))
      : computedOccurrences;
    const batch = pool.slice(0, clamped);
    onChangeSelectedDates(batch);

    // Automatically reveal enough months so the last selected occurrence is visible
    const lastSelected = batch[batch.length - 1];
    if (lastSelected) {
      const lastDate = fromApiDate(lastSelected);
      if (isValid(lastDate)) {
        const diffMonths =
          (lastDate.getFullYear() - baseMonthStart.getFullYear()) * 12 +
          (lastDate.getMonth() - baseMonthStart.getMonth()) +
          1;
        if (diffMonths > monthsToShow) {
          const rounded = Math.min(
            MAX_MONTHS_TO_SHOW,
            Math.ceil(diffMonths / MONTHS_STEP) * MONTHS_STEP,
          );
          setMonthsToShow(rounded);
        }
      }
    }
  };

  const handleQuickSelect = (count: number) => {
    setCustomCountInput(String(count));
    applyOccurrenceCount(count);
  };

  const handleCustomCountChange = (raw: string) => {
    setCustomCountInput(raw);
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChangeSelectedDates([]);
      return;
    }
    const num = Number.parseInt(trimmed, 10);
    if (Number.isInteger(num) && num >= 1) {
      applyOccurrenceCount(num);
    }
  };

  const toggleMonthOccurrences = (monthOccurrenceDates: ApiDate[]) => {
    if (monthOccurrenceDates.length === 0) return;
    const allSelected = monthOccurrenceDates.every((d) => selectedDates.includes(d));
    let next: ApiDate[];
    if (allSelected) {
      const removeSet = new Set(monthOccurrenceDates);
      next = selectedDates.filter((d) => !removeSet.has(d));
    } else {
      const merged = new Set([...selectedDates, ...monthOccurrenceDates]);
      next = Array.from(merged).sort();
    }
    setCustomCountInput(next.length > 0 ? String(next.length) : '');
    onChangeSelectedDates(next);
  };

  // Check if series has already ended before the end of currently visible months
  const canShowMoreMonths = useMemo(() => {
    if (monthsToShow >= MAX_MONTHS_TO_SHOW) return false;
    if (event?.recurrenceEndDate) {
      const endLimit = fromApiDate(event.recurrenceEndDate);
      const lastVisibleMonth = calendarMonths[calendarMonths.length - 1];
      if (isValid(endLimit) && lastVisibleMonth && endOfMonth(lastVisibleMonth) >= endLimit) {
        return false;
      }
    }
    return true;
  }, [monthsToShow, event, calendarMonths]);

  return (
    <div className="space-y-3.5 rounded-xl border border-dark-border bg-dark-bg/60 p-4">
      {/* Top Toolbar: Custom Number Input + Quick-Select Presets */}
      <div className="flex flex-col gap-2.5 border-b border-dark-border pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={countInputId}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-200"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Select next</span>
          </label>

          <div className="relative flex items-center">
            <Hash
              className="pointer-events-none absolute left-2 h-3 w-3 text-zinc-500"
              aria-hidden="true"
            />
            <input
              id={countInputId}
              type="number"
              min={1}
              max={365}
              disabled={disabled}
              value={customCountInput}
              onChange={(e) => handleCustomCountChange(e.target.value)}
              placeholder="e.g. 5"
              aria-label="Number of occurrences to select"
              className="h-7 w-20 rounded-lg border border-dark-border bg-dark-surface pl-6 pr-2 text-xs font-semibold text-zinc-100 outline-none transition-colors placeholder:font-normal placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-60"
            />
          </div>

          <span className="text-xs text-zinc-400">occurrences</span>
        </div>

        {/* Quick-Select Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[11px] text-zinc-500">Quick select:</span>
          {QUICK_SELECT_COUNTS.map((count) => {
            const targetBatch = computedOccurrences.slice(0, count);
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
                    ? isDanger
                      ? 'border-red-400 bg-red-500/25 text-red-100'
                      : 'border-indigo-400 bg-indigo-500/25 text-indigo-100'
                    : 'border-dark-border bg-dark-surface text-zinc-300 hover:border-zinc-600 hover:text-zinc-100',
                )}
              >
                {count}
              </button>
            );
          })}

          {selectedDates.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setCustomCountInput('');
                onChangeSelectedDates([]);
              }}
              className="ml-1 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Multi-Month Mini-Calendar Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {calendarMonths.map((monthStart) => {
          const monthKey = format(monthStart, 'yyyy-MM');
          const monthLabel = format(monthStart, 'MMM yyyy');
          const daysInMonth = eachDayOfInterval({
            start: monthStart,
            end: endOfMonth(monthStart),
          });
          const leadingBlanks = getMondayBasedOffset(monthStart);

          // Occurrences falling within this month
          const monthOccurrenceDates = daysInMonth
            .map((d) => toApiDate(d))
            .filter((dateStr) => occurrenceSet.has(dateStr));
          const selectedInMonthCount = monthOccurrenceDates.filter((dateStr) =>
            selectedDates.includes(dateStr),
          ).length;
          const hasMonthOccurrences = monthOccurrenceDates.length > 0;
          const isAllMonthSelected =
            hasMonthOccurrences && selectedInMonthCount === monthOccurrenceDates.length;
          const isPartialMonthSelected =
            selectedInMonthCount > 0 && !isAllMonthSelected;

          return (
            <div
              key={monthKey}
              className={cn(
                'rounded-lg border p-2.5 transition-colors',
                isAllMonthSelected
                  ? isDanger
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-dark-border/80 bg-dark-surface/70',
              )}
            >
              {/* Month Header with Tick / Select-All Toggle */}
              <div className="mb-2 flex items-center justify-between gap-1.5">
                {hasMonthOccurrences ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMonthOccurrences(monthOccurrenceDates)}
                    aria-label={`${isAllMonthSelected ? 'Deselect' : 'Select'} all occurrences in ${monthLabel}`}
                    aria-pressed={isAllMonthSelected}
                    title={`Click to ${isAllMonthSelected ? 'deselect' : 'select'} all ${monthOccurrenceDates.length} occurrences in ${monthLabel}`}
                    className="group flex flex-1 items-center justify-between rounded-md px-1.5 py-1 text-xs font-semibold text-zinc-200 transition-colors hover:bg-dark-hover"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                          isAllMonthSelected
                            ? isDanger
                              ? 'border-red-400 bg-red-500 text-white'
                              : 'border-indigo-400 bg-indigo-500 text-white'
                            : isPartialMonthSelected
                              ? isDanger
                                ? 'border-red-400/70 bg-red-500/20 text-red-200'
                                : 'border-indigo-400/70 bg-indigo-500/20 text-indigo-200'
                              : 'border-zinc-600 bg-dark-bg group-hover:border-zinc-400',
                        )}
                      >
                        {isAllMonthSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                        {isPartialMonthSelected && (
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                      <span>{monthLabel}</span>
                    </span>

                    <span className="rounded-full bg-dark-bg/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400">
                      {selectedInMonthCount}/{monthOccurrenceDates.length}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-1 items-center justify-center gap-1 py-1 text-xs font-semibold text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{monthLabel}</span>
                  </div>
                )}
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

      {/* Show More / Show Fewer Months Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {canShowMoreMonths && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setMonthsToShow((prev) => Math.min(MAX_MONTHS_TO_SHOW, prev + MONTHS_STEP))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-indigo-400/50 hover:text-white"
          >
            <ChevronDown className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Show more months (+{MONTHS_STEP})</span>
          </button>
        )}

        {monthsToShow > INITIAL_MONTHS_TO_SHOW && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMonthsToShow(INITIAL_MONTHS_TO_SHOW)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Show fewer months</span>
          </button>
        )}
      </div>

      {/* Selected dates summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-border/70 pt-2.5 text-xs text-zinc-400">
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
      description:
        'Enter how many occurrences to select, tick whole months, or pick specific dates.',
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
          event={event}
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
