import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addHours, startOfHour } from 'date-fns';
import { Lock, Repeat } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { useCreateEvent, useUpdateEvent } from '../../hooks/useEvents';
import { useToast } from '../../hooks/useToast';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import {
  fromApiDateTime,
  fromInputDateTime,
  toApiDateTime,
  toInputDateTime,
} from '../../utils/date';
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_TITLE_MAX,
  eventSchema,
  type EventFormValues,
} from '../../utils/validation';
import type { CategoryResponseDTO } from '../../types/category';
import type { EventRequestDTO, EventResponseDTO } from '../../types/event';

export interface EventSlotRange {
  start: Date;
  end: Date;
}

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, edits this event via PUT /api/events/{id} (sending the full body). */
  event?: EventResponseDTO | null;
  /** Initial start/end when the user clicked or dragged a calendar slot. */
  initialSlot?: EventSlotRange | null;
  categories: CategoryResponseDTO[];
  /** Optional override used by tests to inspect the submitted payload directly. */
  onSubmitPayload?: (payload: EventRequestDTO) => Promise<void> | void;
}

function buildDefaultValues(
  event?: EventResponseDTO | null,
  initialSlot?: EventSlotRange | null,
): EventFormValues {
  if (event) {
    return {
      title: event.title,
      description: event.description ?? '',
      startTime: toInputDateTime(fromApiDateTime(event.startTime)),
      endTime: toInputDateTime(fromApiDateTime(event.endTime)),
      isFlexible: event.isFlexible,
      isPrivate: event.isPrivate,
      categoryIds: event.categories.map((c) => c.categoryId),
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
  };
}

function EventFormBody({
  onClose,
  event,
  initialSlot,
  categories,
  onSubmitPayload,
}: Omit<EventFormModalProps, 'isOpen'>) {
  const isEditing = Boolean(event);
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const [formError, setFormError] = useState<string | null>(null);
  const [initialDefaults] = useState(() => buildDefaultValues(event, initialSlot));

  const {
    register,
    handleSubmit,
    setValue,
    setError,
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

  const onSubmit = async (values: EventFormValues) => {
    setFormError(null);

    // Format startTime and endTime as LocalDateTime ("yyyy-MM-dd'T'HH:mm:ss"), never toISOString().
    const trimmedDesc = values.description.trim();
    const payload: EventRequestDTO = {
      title: values.title.trim(),
      ...(trimmedDesc !== '' ? { description: trimmedDesc } : {}),
      startTime: toApiDateTime(fromInputDateTime(values.startTime)),
      endTime: toApiDateTime(fromInputDateTime(values.endTime)),
      isFlexible: values.isFlexible,
      categoryIds: values.categoryIds,
      isPrivate: values.isPrivate,
    };

    try {
      if (onSubmitPayload) {
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
      ]);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

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

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
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
}: EventFormModalProps) {
  const isEditing = Boolean(event);
  const formKey = event
    ? `edit-${event.eventId}`
    : initialSlot
      ? `slot-${initialSlot.start.getTime()}-${initialSlot.end.getTime()}`
      : 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit event' : 'New event'}
      maxWidth="lg"
    >
      {isOpen && (
        <EventFormBody
          key={formKey}
          onClose={onClose}
          event={event}
          initialSlot={initialSlot}
          categories={categories}
          onSubmitPayload={onSubmitPayload}
        />
      )}
    </Modal>
  );
}
