import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, startOfHour } from 'date-fns';
import { Infinity as InfinityIcon, Layers, Lock, Repeat, Smile, Waves, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { DateTime24Input } from '../ui/Time24Input';
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
  WEEKDAY_OPTIONS,
  buildScopeRequestDTO,
  generateUpcomingOccurrenceDates,
  getEventOccurrenceDate,
  getWeekdayNameFromDate,
  parseRecurrenceDays,
  serializeRecurrenceDays,
  type ScopeChoice,
} from '../../utils/recurrence';
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_EMOJI_MAX,
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
  WeekdayName,
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

const INTERVAL_UNIT_LABELS: Record<
  Exclude<RecurrenceType, 'NONE'>,
  { singular: string; plural: string }
> = {
  DAILY: { singular: 'day', plural: 'days' },
  WEEKLY: { singular: 'week', plural: 'weeks' },
  MONTHLY: { singular: 'month', plural: 'months' },
  YEARLY: { singular: 'year', plural: 'years' },
};

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, edits this event via PUT /api/events/{id} (or PUT /api/events/{id}/scope if recurring). */
  event?: EventResponseDTO | null;
  /** When set, pre-populates a new event from an existing event (1-click Duplicate). */
  duplicateFromEvent?: EventResponseDTO | null;
  /** Initial start/end when the user clicked or dragged a calendar slot. */
  initialSlot?: EventSlotRange | null;
  categories: CategoryResponseDTO[];
  /** Optional override used by tests to inspect the submitted payload directly. */
  onSubmitPayload?: (payload: EventRequestDTO) => Promise<void> | void;
  /** Optional override used by tests to inspect scoped edit payload directly. */
  onSubmitScopePayload?: (payload: EventScopeRequestDTO) => Promise<void> | void;
}

interface EmojiCategory {
  name: string;
  emojis: readonly string[];
}

const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    name: 'Books & Study',
    emojis: [
      '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📑', '🔖', '📜',
      '📄', '📝', '✍️', '🖊️', '🖋️', '✏️', '🎓', '🎒', '📐', '📏', '🔬', '💡',
    ],
  },
  {
    name: 'Work & Tech',
    emojis: [
      '💼', '💻', '🖥️', '⌨️', '🖱️', '📱', '📊', '📈', '📉', '📋', '📁', '📂',
      '🗂️', '🗓️', '✉️', '📞', '🔭', '🧪', '🧬', '🔍', '⚙️', '🖨️', '💾', '🏷️',
    ],
  },
  {
    name: 'Sports & Fitness',
    emojis: [
      '🏋️', '🏃', '🚴', '🧘', '🚶', '🧗', '🏊', '⚽', '🏀', '🎾', '🏐', '🏸',
      '🥊', '🥋', '🛹', '⛷️', '🤸', '🎳', '🏆', '🥇', '👟', '⛳', '🏄', '🚵',
    ],
  },
  {
    name: 'Health & Mind',
    emojis: [
      '🩺', '💊', '🫀', '🧠', '🍎', '🥑', '🥗', '💧', '🌱', '🌿', '😴', '🧘‍♀️',
      '🧴', '🩹', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '✨', '🪄', '🛁',
    ],
  },
  {
    name: 'Food & Drinks',
    emojis: [
      '☕', '🍵', '🧋', '🥤', '🍽️', '🍳', '🥐', '🥪', '🍕', '🍔', '🍟', '🍜',
      '🍱', '🍣', '🌮', '🥗', '🍰', '🍫', '🍦', '🍇', '🍓', '🍷', '🍺', '🍻',
    ],
  },
  {
    name: 'Daily & Home',
    emojis: [
      '🏠', '🛋️', '🛏️', '🚿', '🧹', '🧺', '🛒', '📦', '🔑', '🚗', '🚌', '🚲',
      '⛽', '💰', '💳', '🐕', '🐈', '🪴', '🌸', '☀️', '🌙', '👕', '👔', '⏰',
    ],
  },
  {
    name: 'Activities & Fun',
    emojis: [
      '🎉', '🎂', '✈️', '🧳', '🎮', '🕹️', '🎲', '♟️', '🧩', '🎵', '🎧', '🎸',
      '🎹', '🎤', '🎬', '🍿', '🎨', '📸', '🏖️', '⛺', '🎆', '🎟️', '🎡', '🎭',
    ],
  },
  {
    name: 'Focus & Alerts',
    emojis: [
      '⏰', '⏱️', '⏲️', '⏳', '⌛', '🎯', '🔥', '⚡', '⭐', '🌟', '💎', '🔔',
      '📢', '🚨', '⚠️', '🛡️', '✅', '❌', '🛑', '🏁', '📌', '🚀', '💯', '🔮',
    ],
  },
] as const;

function buildDefaultValues(
  sourceEvent?: EventResponseDTO | null,
  initialSlot?: EventSlotRange | null,
): EventFormValues {
  if (sourceEvent) {
    const startDate = fromApiDateTime(sourceEvent.startTime);
    const recurrenceType: RecurrenceType = sourceEvent.recurrenceType ?? 'NONE';
    const hasEndDate = Boolean(
      sourceEvent.recurrenceEndDate && sourceEvent.recurrenceEndDate.trim() !== '',
    );
    const parsedDays = parseRecurrenceDays(sourceEvent.recurrenceDays);
    const defaultWeekday = getWeekdayNameFromDate(startDate);

    return {
      title: sourceEvent.title,
      emoji: sourceEvent.emoji ?? '',
      description: sourceEvent.description ?? '',
      startTime: toInputDateTime(startDate),
      endTime: toInputDateTime(fromApiDateTime(sourceEvent.endTime)),
      isFlexible: sourceEvent.isFlexible,
      isPrivate: sourceEvent.isPrivate,
      categoryIds: sourceEvent.categories.map((c) => c.categoryId),
      recurrenceType,
      recurrenceInterval:
        sourceEvent.recurrenceInterval && sourceEvent.recurrenceInterval >= 1
          ? sourceEvent.recurrenceInterval
          : 1,
      recurrenceDays: parsedDays.length > 0 ? parsedDays : [defaultWeekday],
      repeatForever: !hasEndDate,
      recurrenceEndDate: sourceEvent.recurrenceEndDate ?? '',
    };
  }

  const defaultStart = initialSlot?.start ?? addHours(startOfHour(new Date()), 1);
  const defaultEnd = initialSlot?.end ?? addHours(defaultStart, 1);

  return {
    title: '',
    emoji: '',
    description: '',
    startTime: toInputDateTime(defaultStart),
    endTime: toInputDateTime(defaultEnd),
    isFlexible: false,
    isPrivate: false,
    categoryIds: [],
    recurrenceType: 'NONE',
    recurrenceInterval: 1,
    recurrenceDays: [getWeekdayNameFromDate(defaultStart)],
    repeatForever: true,
    recurrenceEndDate: '',
  };
}

function EventFormBody({
  onClose,
  event,
  duplicateFromEvent,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: Omit<EventFormModalProps, 'isOpen'>) {
  const isEditing = Boolean(event);
  const templateEvent = event ?? duplicateFromEvent ?? null;
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const repeatSelectId = useId();
  const intervalInputId = useId();
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
  const [daysTouched, setDaysTouched] = useState<boolean>(() =>
    Boolean(templateEvent?.recurrenceDays),
  );
  const [intervalTouched, setIntervalTouched] = useState<boolean>(() =>
    Boolean(templateEvent?.recurrenceInterval && templateEvent.recurrenceInterval > 1),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [initialDefaults] = useState(() =>
    buildDefaultValues(templateEvent, initialSlot),
  );

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

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('All');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEmojiPickerOpen]);

  const watchedDescription = useWatch({ control, name: 'description' });
  const watchedEmoji = useWatch({ control, name: 'emoji' });
  const watchedFlexible = useWatch({ control, name: 'isFlexible' });
  const watchedPrivate = useWatch({ control, name: 'isPrivate' });
  const watchedCategoryIds = useWatch({ control, name: 'categoryIds' });
  const watchedRecurrenceType = useWatch({ control, name: 'recurrenceType' });
  const watchedRecurrenceInterval = useWatch({ control, name: 'recurrenceInterval' });
  const watchedRecurrenceDays = useWatch({ control, name: 'recurrenceDays' });
  const watchedRepeatForever = useWatch({ control, name: 'repeatForever' });
  const watchedStartTime = useWatch({ control, name: 'startTime' });
  const watchedEndTime = useWatch({ control, name: 'endTime' });

  const toggleWeekdayPill = (day: WeekdayName) => {
    setDaysTouched(true);
    const exists = watchedRecurrenceDays.includes(day);
    let next: WeekdayName[];
    if (exists) {
      // Keep at least one weekday selected
      next =
        watchedRecurrenceDays.length > 1
          ? watchedRecurrenceDays.filter((d) => d !== day)
          : watchedRecurrenceDays;
    } else {
      next = [...watchedRecurrenceDays, day];
    }
    setValue('recurrenceDays', next, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: EventFormValues) => {
    setFormError(null);

    if (event && isRecurringEvent && scopeChoice === 'CUSTOM' && selectedCustomDates.length === 0) {
      setFormError('Please select at least one occurrence date to update.');
      return;
    }

    const startDate = fromInputDateTime(values.startTime);
    const trimmedDesc = values.description.trim();
    const includeRecurrence =
      values.recurrenceType !== 'NONE' || isRecurringEvent;

    const resolvedEndDate =
      values.recurrenceType === 'NONE' || values.repeatForever
        ? null
        : values.recurrenceEndDate.trim() || null;

    const normalizedInterval =
      Number.isInteger(values.recurrenceInterval) && values.recurrenceInterval >= 1
        ? values.recurrenceInterval
        : 1;

    const includeInterval =
      values.recurrenceType !== 'NONE' &&
      (normalizedInterval > 1 ||
        intervalTouched ||
        templateEvent?.recurrenceInterval !== undefined);

    const startWeekday = getWeekdayNameFromDate(startDate);
    const activeDays =
      values.recurrenceDays.length > 0 ? values.recurrenceDays : [startWeekday];
    const serializedDays = serializeRecurrenceDays(activeDays);
    const includeDays =
      values.recurrenceType === 'WEEKLY' &&
      (daysTouched ||
        activeDays.length > 1 ||
        activeDays[0] !== startWeekday ||
        Boolean(templateEvent?.recurrenceDays));

    const trimmedEmoji = values.emoji?.trim();
    const emojiPayload = trimmedEmoji
      ? { emoji: trimmedEmoji }
      : isEditing && templateEvent?.emoji
        ? { emoji: null }
        : {};

    const payload: EventRequestDTO = {
      title: values.title.trim(),
      ...emojiPayload,
      ...(trimmedDesc !== '' ? { description: trimmedDesc } : {}),
      startTime: toApiDateTime(startDate),
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
      ...(includeInterval ? { recurrenceInterval: normalizedInterval } : {}),
      ...(includeDays ? { recurrenceDays: serializedDays } : {}),
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
        toast.success(duplicateFromEvent ? 'Event duplicated' : 'Event created');
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

  const intervalUnit =
    watchedRecurrenceType !== 'NONE'
      ? watchedRecurrenceInterval === 1
        ? INTERVAL_UNIT_LABELS[watchedRecurrenceType].singular
        : INTERVAL_UNIT_LABELS[watchedRecurrenceType].plural
      : 'days';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      {/* Title & Emoji Picker */}
      <div className="w-full space-y-1.5">
        <label htmlFor="event-title-input" className="block text-sm font-medium text-zinc-300">
          Title
        </label>
        <div className="relative flex items-center gap-2">
          {/* Emoji Picker Trigger & Popover */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              aria-label={
                watchedEmoji
                  ? `Emoji: ${watchedEmoji} (click to change)`
                  : 'Pick an emoji for this event'
              }
              title={watchedEmoji ? `Emoji: ${watchedEmoji} (click to change)` : 'Add emoji'}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                watchedEmoji
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-zinc-100 hover:bg-indigo-500/25'
                  : 'border-dark-border bg-dark-bg/70 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
              )}
            >
              {watchedEmoji ? (
                <span className="text-xl leading-none">{watchedEmoji}</span>
              ) : (
                <Smile className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {isEmojiPickerOpen && (
              <div
                className="absolute left-0 top-13 z-50 w-84 max-w-[92vw] rounded-2xl border border-dark-border bg-dark-surface p-3.5 shadow-2xl backdrop-blur-md animate-fade-in sm:w-96"
                role="dialog"
                aria-label="Choose emoji"
              >
                <div className="mb-2 flex items-center justify-between border-b border-dark-border/80 pb-2">
                  <span className="text-xs font-semibold text-zinc-100">Select Emoji</span>
                  <div className="flex items-center gap-1.5">
                    {watchedEmoji && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('emoji', '', { shouldDirty: true, shouldValidate: true });
                          setIsEmojiPickerOpen(false);
                        }}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen(false)}
                      className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-200"
                      aria-label="Close emoji picker"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="mb-2.5 flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedEmojiCategory('All')}
                    className={cn(
                      'shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors',
                      selectedEmojiCategory === 'All'
                        ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/30'
                        : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
                    )}
                  >
                    All
                  </button>
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedEmojiCategory(cat.name)}
                      className={cn(
                        'shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors',
                        selectedEmojiCategory === cat.name
                          ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/30'
                          : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Emoji Grid */}
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {EMOJI_CATEGORIES.filter(
                    (cat) => selectedEmojiCategory === 'All' || selectedEmojiCategory === cat.name,
                  ).map((cat) => (
                    <div key={cat.name}>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {cat.name}
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                        {cat.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setValue('emoji', emoji, { shouldDirty: true, shouldValidate: true });
                              setIsEmojiPickerOpen(false);
                            }}
                            className={cn(
                              'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-xl sm:text-2xl transition-transform hover:scale-115 hover:bg-dark-hover active:scale-95',
                              watchedEmoji === emoji &&
                                'bg-indigo-500/25 ring-2 ring-indigo-400',
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Typing / Pasting input */}
                <div className="mt-2.5 border-t border-dark-border/80 pt-2.5">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="shrink-0 text-xs font-medium">Custom:</span>
                    <input
                      type="text"
                      placeholder="Paste or type any emoji"
                      maxLength={EVENT_EMOJI_MAX}
                      value={watchedEmoji ?? ''}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setIsEmojiPickerOpen(false);
                        }
                      }}
                      onChange={(e) =>
                        setValue('emoji', e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-dark-border bg-dark-bg/80 px-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <input
              id="event-title-input"
              type="text"
              placeholder="e.g. Team Standup, Study Session"
              maxLength={EVENT_TITLE_MAX}
              autoFocus
              aria-invalid={errors.title ? true : undefined}
              className={cn(
                'h-10 sm:h-11 w-full rounded-lg border bg-dark-bg/70 px-3.5 text-sm sm:text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-500',
                'focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                errors.title
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/30'
                  : 'border-dark-border focus:border-indigo-400 focus:ring-indigo-500/30',
              )}
              {...register('title')}
            />
          </div>
        </div>
        {errors.title && (
          <p className="text-xs font-medium text-red-400">{errors.title.message}</p>
        )}
        {errors.emoji && (
          <p className="text-xs font-medium text-red-400">{errors.emoji.message}</p>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <DateTime24Input
          label="Start time"
          watchedValue={watchedStartTime}
          error={errors.startTime?.message}
          {...register('startTime', {
            onChange: (e) => {
              if (!daysTouched) {
                const parsed = fromInputDateTime(String(e.target.value));
                setValue('recurrenceDays', [getWeekdayNameFromDate(parsed)]);
              }
            },
          })}
        />
        <DateTime24Input
          label="End time"
          watchedValue={watchedEndTime}
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
            <Repeat className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>Repeat</span>
          </label>
          <select
            id={repeatSelectId}
            disabled={isSubmitting}
            className="h-11 sm:h-10.5 w-full rounded-xl border border-dark-border bg-dark-bg/70 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            {...register('recurrenceType', {
              onChange: (e) => {
                if (e.target.value === 'WEEKLY' && watchedRecurrenceDays.length === 0) {
                  const parsed = fromInputDateTime(watchedStartTime);
                  setValue('recurrenceDays', [getWeekdayNameFromDate(parsed)]);
                }
              },
            })}
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
            {/* Custom Interval: Every [ X ] [days/weeks/months/years] */}
            <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-dark-border/80 bg-dark-surface/60 px-3 py-2">
              <label
                htmlFor={intervalInputId}
                className="text-xs font-medium text-zinc-300"
              >
                Repeat every
              </label>
              <input
                id={intervalInputId}
                type="number"
                min={1}
                max={99}
                disabled={isSubmitting}
                aria-label="Recurrence interval"
                className="h-10 w-24 rounded-lg border border-dark-border bg-dark-bg px-2.5 text-center text-xs sm:text-sm font-semibold text-zinc-100 outline-none transition-colors focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/40"
                {...register('recurrenceInterval', {
                  valueAsNumber: true,
                  onChange: () => setIntervalTouched(true),
                })}
              />
              <span className="text-xs font-medium text-zinc-300">{intervalUnit}</span>
            </div>

            {/* Multi-Day Weekly Weekday Selection Pills */}
            {watchedRecurrenceType === 'WEEKLY' && (
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-zinc-300">
                  Repeat on days
                </span>
                <div
                  role="group"
                  aria-label="Repeat on days of the week"
                  className="flex flex-wrap items-center gap-1.5 sm:gap-2"
                >
                  {WEEKDAY_OPTIONS.map((dayOpt) => {
                    const isSelected = watchedRecurrenceDays.includes(dayOpt.value);
                    return (
                      <button
                        key={dayOpt.value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => toggleWeekdayPill(dayOpt.value)}
                        aria-label={dayOpt.fullLabel}
                        aria-pressed={isSelected}
                        title={dayOpt.fullLabel}
                        className={cn(
                          'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border text-xs sm:text-sm font-semibold transition-all',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                          isSelected
                            ? 'border-indigo-400 bg-indigo-500 text-white shadow-xs'
                            : 'border-dark-border bg-dark-surface text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                        )}
                      >
                        {dayOpt.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
          icon={<Waves className="h-4 w-4" aria-hidden="true" />}
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
              event={event ?? undefined}
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

      <div className="sticky bottom-0 z-10 -mx-3.5 -mb-3.5 flex items-center justify-end gap-2.5 border-t border-dark-border bg-dark-surface/95 px-4 py-3 backdrop-blur-md sm:-mx-5 sm:-mb-5 sm:px-5 sm:py-3.5">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Saving..."
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
  duplicateFromEvent,
  initialSlot,
  categories,
  onSubmitPayload,
  onSubmitScopePayload,
}: EventFormModalProps) {
  const isEditing = Boolean(event);
  const isDuplicating = !isEditing && Boolean(duplicateFromEvent);
  const isRecurringEvent = Boolean(
    event?.recurrenceType && event.recurrenceType !== 'NONE',
  );
  const formKey = event
    ? `edit-${event.occurrenceId || event.eventId}`
    : duplicateFromEvent
      ? `dup-${duplicateFromEvent.occurrenceId || duplicateFromEvent.eventId}`
      : initialSlot
        ? `slot-${initialSlot.start.getTime()}-${initialSlot.end.getTime()}`
        : 'new';

  const modalTitle = isEditing
    ? 'Edit event'
    : isDuplicating
      ? 'Duplicate event'
      : 'New event';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth={isEditing && isRecurringEvent ? 'xl' : 'lg'}
    >
      {isOpen && (
        <EventFormBody
          key={formKey}
          onClose={onClose}
          event={event}
          duplicateFromEvent={duplicateFromEvent}
          initialSlot={initialSlot}
          categories={categories}
          onSubmitPayload={onSubmitPayload}
          onSubmitScopePayload={onSubmitScopePayload}
        />
      )}
    </Modal>
  );
}
