import { useId, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, startOfHour } from 'date-fns';
import { Infinity as InfinityIcon, Layers, Lock, RefreshCw, Repeat } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { RecurrenceCustomDatePicker } from './RecurrenceScopeModal';
import {
  useCreateEvent,
  useUpdateEvent,
  useUpdateEventWithScope,
} from '../../hooks/useEvents';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import {
  formatDate,
  fromApiDateTime,
  fromInputDateTime,
  toApiDateTime,
  toInputDateTime,
} from '../../utils/date';
import {
  buildScopeRequestDTO,
  generateUpcomingOccurrenceDates,
  getEventOccurrenceDate,
  type ScopeChoice,
} from '../../utils/recurrence';
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_TITLE_MAX,
  eventSchema,
  type EventFormValues,
} from '../../utils/validation';
import type { ApiDate } from '../../types/api';
import type { CategoryResponseDTO } from '../../types/category';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
  RecurrenceType,
} from '../../types/event';

export interface EventSlotRange {
  start: Date;
  end: Date;
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'MONTHLY', label: 'Every month' },
  { value: 'YEARLY', label: 'Every year' },
];

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, edits this event via PUT /api/events/{id} (or PUT /api/events/{id}/scope if recurring). */
  event?: EventResponseDTO | null;
  /** Initial start/end when the user clicked or dragged a calendar slot. */
  initialSlot?: EventSlotRange | null;
  categories: CategoryResponseDTO[];
  /** Optional override used by tests to inspect the submitted payload directly. */
  onSubmitPayload?: (payload: EventRequestDTO) => Promise<void> | void;
  /** Optional override used by tests to inspect scoped edit payload directly. */
  onSubmitScopePayload?: (payload: EventScopeRequestDTO) => Promise<void> | void;
}

function buildDefaultValues(
  event?: EventResponseDTO | null,
  initialSlot?: EventSlotRange | null,
): EventFormValues {
  if (event) {
    const recurrenceType: RecurrenceType = event.recurrenceType ?? 'NONE';
    const hasEndDate = Boolean(
      event.recurrenceEndDate && event.recurrenceEndDate.trim() !== '',
    );
    return {
      title: event.title,
      description: event.description ?? '',
      startTime: toInputDateTime(fromApiDateTime(event.startTime)),
      endTime: toInputDateTime(fromApiDateTime(event.endTime)),
      isFlexible: event.isFlexible,
      isPrivate: event.isPrivate,
      categoryIds: event.categories.map((c) => c.categoryId),
      recurrenceType,
      repeatForever: !hasEndDate,
      recurrenceEndDate: event.recurrenceEndDate ?? '',
    };
  }

  const defaultStart = initialSlot?.start ?? addHours(startOfHour(new Date()), 1);
  const defaultEnd = initialSlot?.end ?? addHours(defaultStart, 1);

  return {
    title: '',
    description: '',
    startTime: toInputDateTime(defaultStart),
    endTime: toInputDateTime(defaultEnd),
    isFlexible: false,
    isPrivate: false,
    categoryIds: [],
    recurrenceType: 'NONE',
    repeatForever: true,
    recurrenceEndDate: '',
  };
}

function EventFormBody({
  onClose,
  event,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: Omit<EventFormModalProps, 'isOpen'>) {
  const isEditing = Boolean(event);
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const repeatSelectId = useId();
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const updateScopeMutation = useUpdateEventWithScope();

  const currentOccurrenceDate = useMemo(
    () => (event ? getEventOccurrenceDate(event) : ''),
    [event],
  );
  const upcomingOccurrences = useMemo(
    () => (event && isRecurringEvent ? generateUpcomingOccurrenceDates(event, 3, 12) : []),
    [event, isRecurringEvent],
  );

  const [scopeChoice, setScopeChoice] = useState<ScopeChoice>('THIS_ONLY');
  const [selectedCustomDates, setSelectedCustomDates] = useState<ApiDate[]>(() =>
    currentOccurrenceDate ? [currentOccurrenceDate] : [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [initialDefaults] = useState(() => buildDefaultValues(event, initialSlot));

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialDefaults,
  });

  const watchedDescription = useWatch({ control, name: 'description' });
  const watchedFlexible = useWatch({ control, name: 'isFlexible' });
  const watchedPrivate = useWatch({ control, name: 'isPrivate' });
  const watchedCategoryIds = useWatch({ control, name: 'categoryIds' });
  const watchedRecurrenceType = useWatch({ control, name: 'recurrenceType' });
  const watchedRepeatForever = useWatch({ control, name: 'repeatForever' });

  const onSubmit = async (values: EventFormValues) => {
    setFormError(null);

    if (event && isRecurringEvent && scopeChoice === 'CUSTOM' && selectedCustomDates.length === 0) {
      setFormError('Please select at least one occurrence date to update.');
      return;
    }

    // Format startTime and endTime as LocalDateTime ("yyyy-MM-dd'T'HH:mm:ss"), never toISOString().
    const trimmedDesc = values.description.trim();
    const includeRecurrence =
      values.recurrenceType !== 'NONE' || isRecurringEvent;

    const resolvedEndDate =
      values.recurrenceType === 'NONE' || values.repeatForever
        ? null
        : values.recurrenceEndDate.trim() || null;

    const payload: EventRequestDTO = {
      title: values.title.trim(),
      ...(trimmedDesc !== '' ? { description: trimmedDesc } : {}),
      startTime: toApiDateTime(fromInputDateTime(values.startTime)),
      endTime: toApiDateTime(fromInputDateTime(values.endTime)),
      isFlexible: values.isFlexible,
      categoryIds: values.categoryIds,
      isPrivate: values.isPrivate,
      ...(includeRecurrence
        ? {
            recurrenceType: values.recurrenceType,
            recurrenceEndDate: resolvedEndDate,
          }
        : {}),
    };

    try {
      if (event && isRecurringEvent) {
        const scopePayload = buildScopeRequestDTO(
          scopeChoice,
          currentOccurrenceDate,
          selectedCustomDates,
          payload,
        );

        if (onSubmitScopePayload) {
          await onSubmitScopePayload(scopePayload);
        } else if (onSubmitPayload) {
          await onSubmitPayload(payload);
        } else {
          await updateScopeMutation.mutateAsync({
            eventId: event.eventId,
            body: scopePayload,
          });
          toast.success('Event updated');
        }
      } else if (onSubmitPayload) {
        await onSubmitPayload(payload);
      } else if (event) {
        await updateMutation.mutateAsync({
          eventId: event.eventId,
          body: payload,
        });
        toast.success('Event updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Event created');
      }
      onClose();
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, [
        'title',
        'description',
        'startTime',
        'endTime',
        'recurrenceEndDate',
      ]);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

  const inlineScopeOptions: {
    id: ScopeChoice;
    label: string;
    description: string;
  }[] = [
    {
      id: 'THIS_ONLY',
      label: 'This event only',
      description: currentOccurrenceDate
        ? `Only ${formatDate(currentOccurrenceDate)}`
        : 'Only this occurrence',
    },
    {
      id: 'THIS_AND_FOLLOWING',
      label: 'This and following events',
      description: 'From this date onward',
    },
    {
      id: 'ALL',
      label: 'All events in series',
      description: 'Every occurrence in series',
    },
    {
      id: 'CUSTOM',
      label: 'Custom dates...',
      description: 'Pick specific occurrences',
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Input
        label="Title"
        placeholder="e.g. Team Standup, Study Session"
        maxLength={EVENT_TITLE_MAX}
        autoFocus
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Input
          label="Start time"
          type="datetime-local"
          error={errors.startTime?.message}
          {...register('startTime')}
        />
        <Input
          label="End time"
          type="datetime-local"
          error={errors.endTime?.message}
          {...register('endTime')}
        />
      </div>

      {/* Recurrence Section */}
      <div className="space-y-3 rounded-xl border border-dark-border bg-dark-bg/40 p-3.5">
        <div className="w-full space-y-1.5">
          <label
            htmlFor={repeatSelectId}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-300"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Repeat</span>
          </label>
          <select
            id={repeatSelectId}
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-dark-border bg-dark-bg/70 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            {...register('recurrenceType')}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-dark-surface text-zinc-100"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {watchedRecurrenceType !== 'NONE' && (
          <div className="space-y-3 pt-1">
            <Toggle
              checked={watchedRepeatForever}
              onChange={(checked) => {
                setValue('repeatForever', checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                if (checked) {
                  setValue('recurrenceEndDate', '', { shouldDirty: true });
                  clearErrors('recurrenceEndDate');
                }
              }}
              label="Repeat Forever"
              description="Continues indefinitely with no end date."
              icon={<InfinityIcon className="h-4 w-4" aria-hidden="true" />}
              disabled={isSubmitting}
            />

            {!watchedRepeatForever && (
              <Input
                label="Ends on"
                type="date"
                error={errors.recurrenceEndDate?.message}
                {...register('recurrenceEndDate')}
              />
            )}
          </div>
        )}
      </div>

      <Textarea
        label="Description"
        placeholder="Optional notes (never shown in squad calendars)"
        maxLength={EVENT_DESCRIPTION_MAX}
        rows={3}
        helperText={`${watchedDescription.length}/${EVENT_DESCRIPTION_MAX} characters`}
        error={errors.description?.message}
        {...register('description')}
      />

      <CategoryMultiSelect
        categories={categories}
        selectedIds={watchedCategoryIds}
        onChange={(nextIds) =>
          setValue('categoryIds', nextIds, { shouldValidate: true, shouldDirty: true })
        }
        disabled={isSubmitting}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          checked={watchedFlexible}
          onChange={(checked) =>
            setValue('isFlexible', checked, { shouldValidate: true, shouldDirty: true })
          }
          label="Flexible time"
          description="Can be moved if needed (shown with a dashed border)."
          icon={<Repeat className="h-4 w-4" aria-hidden="true" />}
          disabled={isSubmitting}
        />
        <Toggle
          checked={watchedPrivate}
          onChange={(checked) =>
            setValue('isPrivate', checked, { shouldValidate: true, shouldDirty: true })
          }
          label="Private event"
          description='Shown to squads as "Busy" even when your squad visibility is PUBLIC.'
          icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          disabled={isSubmitting}
        />
      </div>

      {/* Inline "Apply changes to" section when editing an existing recurring event */}
      {isEditing && isRecurringEvent && (
        <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <Layers className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <span>Apply changes to</span>
          </div>

          <div
            role="radiogroup"
            aria-label="Apply changes to"
            className="grid gap-2 sm:grid-cols-2"
          >
            {inlineScopeOptions.map((opt) => {
              const isSelected = scopeChoice === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors select-none',
                    isSelected
                      ? 'border-indigo-500/60 bg-indigo-500/15 text-zinc-100'
                      : 'border-dark-border bg-dark-bg/60 text-zinc-300 hover:border-zinc-700',
                    isSubmitting && 'pointer-events-none opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="edit-recurrence-scope"
                    value={opt.id}
                    checked={isSelected}
                    disabled={isSubmitting}
                    onChange={() => {
                      setFormError(null);
                      setScopeChoice(opt.id);
                    }}
                    className="mt-0.5 h-4 w-4 accent-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-100">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">{opt.description}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {scopeChoice === 'CUSTOM' && (
            <RecurrenceCustomDatePicker
              currentOccurrenceDate={currentOccurrenceDate}
              upcomingOccurrences={upcomingOccurrences}
              selectedDates={selectedCustomDates}
              onChangeSelectedDates={(next) => {
                setFormError(null);
                setSelectedCustomDates(next);
              }}
              variant="indigo"
              disabled={isSubmitting}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Saving…"
          disabled={
            isEditing &&
            isRecurringEvent &&
            scopeChoice === 'CUSTOM' &&
            selectedCustomDates.length === 0
          }
        >
          {isEditing ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  );
}

export function EventFormModal({
  isOpen,
  onClose,
  event,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: EventFormModalProps) {
  const isEditing = Boolean(event);
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const formKey = event
    ? `edit-${event.occurrenceId || event.eventId}`
    : initialSlot
      ? `slot-${initialSlot.start.getTime()}-${initialSlot.end.getTime()}`
      : 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit event' : 'New event'}
      maxWidth={isEditing && isRecurringEvent ? 'xl' : 'lg'}
    >
      {isOpen && (
        <EventFormBody
          key={formKey}
          onClose={onClose}
          event={event}
          initialSlot={initialSlot}
          categories={categories}
          onSubmitPayload={onSubmitPayload}
          onSubmitScopePayload={onSubmitScopePayload}
        />
      )}
    </Modal>
  );
}
