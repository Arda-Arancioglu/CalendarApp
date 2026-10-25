import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../context/ToastProvider';
import { EventFormModal } from '../EventFormModal';
import { RecurrenceScopeModal } from '../RecurrenceScopeModal';
import type { CategoryResponseDTO } from '../../../types/category';
import type {
  EventRequestDTO,
  EventResponseDTO,
  EventScopeRequestDTO,
} from '../../../types/event';

const SAMPLE_CATEGORIES: CategoryResponseDTO[] = [
  { categoryId: 10, name: 'Work', color: '#4F46E5' },
  { categoryId: 20, name: 'Gym', color: '#10B981' },
];

function renderEventModal(onSubmitPayload = vi.fn<(payload: EventRequestDTO) => void>()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EventFormModal
          isOpen={true}
          onClose={onClose}
          initialSlot={{
            start: new Date(2026, 9, 20, 10, 0, 0),
            end: new Date(2026, 9, 20, 11, 0, 0),
          }}
          categories={SAMPLE_CATEGORIES}
          onSubmitPayload={onSubmitPayload}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );

  return { onSubmitPayload, onClose };
}

describe('EventFormModal component', () => {
  it('validates that Title is required before submitting', async () => {
    const user = userEvent.setup();
    const { onSubmitPayload } = renderEventModal();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(onSubmitPayload).not.toHaveBeenCalled();
  });

  it('validates that End time must be after Start time', async () => {
    const user = userEvent.setup();
    const { onSubmitPayload } = renderEventModal();

    await user.type(screen.getByLabelText(/title/i), 'Sprint Review');
    const startInput = screen.getByLabelText(/start time/i);
    const endInput = screen.getByLabelText(/end time/i);

    await user.clear(startInput);
    await user.type(startInput, '2026-10-20T15:00');
    await user.clear(endInput);
    await user.type(endInput, '2026-10-20T14:00');

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(await screen.findByText(/end time must be after start time/i)).toBeInTheDocument();
    expect(onSubmitPayload).not.toHaveBeenCalled();
  });

  it('submits a valid EventRequestDTO with LocalDateTime strings (no Z suffix)', async () => {
    const user = userEvent.setup();
    const { onSubmitPayload, onClose } = renderEventModal();

    await user.type(screen.getByLabelText(/title/i), '  Architecture Sync  ');
    await user.type(screen.getByLabelText(/description/i), 'Discuss API contracts');

    // Select the "Work" category pill
    await user.click(screen.getByRole('button', { name: /work/i }));

    // Enable the "Private event" toggle
    await user.click(screen.getByRole('switch', { name: /private event/i }));

    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmitPayload).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitPayload).toHaveBeenCalledWith({
      title: 'Architecture Sync',
      description: 'Discuss API contracts',
      startTime: '2026-10-20T10:00:00',
      endTime: '2026-10-20T11:00:00',
      isFlexible: false,
      isPrivate: true,
      categoryIds: [10],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits recurrenceType with recurrenceEndDate = null when Repeat Forever is checked', async () => {
    const user = userEvent.setup();
    const { onSubmitPayload, onClose } = renderEventModal();

    await user.type(screen.getByLabelText(/title/i), 'Daily Standup');
    await user.selectOptions(screen.getByLabelText(/repeat/i), 'DAILY');

    // "Repeat Forever" should be visible and checked by default
    const repeatForeverSwitch = screen.getByRole('switch', { name: /repeat forever/i });
    expect(repeatForeverSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByLabelText(/ends on/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmitPayload).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitPayload).toHaveBeenCalledWith({
      title: 'Daily Standup',
      startTime: '2026-10-20T10:00:00',
      endTime: '2026-10-20T11:00:00',
      isFlexible: false,
      isPrivate: false,
      categoryIds: [],
      recurrenceType: 'DAILY',
      recurrenceEndDate: null,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Ends on date input when Repeat Forever is unchecked and submits recurrenceEndDate', async () => {
    const user = userEvent.setup();
    const { onSubmitPayload, onClose } = renderEventModal();

    await user.type(screen.getByLabelText(/title/i), 'Weekly Demo');
    await user.selectOptions(screen.getByLabelText(/repeat/i), 'WEEKLY');

    // Uncheck "Repeat Forever"
    await user.click(screen.getByRole('switch', { name: /repeat forever/i }));

    const endsOnInput = screen.getByLabelText(/ends on/i);
    await user.type(endsOnInput, '2026-12-31');

    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmitPayload).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitPayload).toHaveBeenCalledWith({
      title: 'Weekly Demo',
      startTime: '2026-10-20T10:00:00',
      endTime: '2026-10-20T11:00:00',
      isFlexible: false,
      isPrivate: false,
      categoryIds: [],
      recurrenceType: 'WEEKLY',
      recurrenceEndDate: '2026-12-31',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('embeds "Apply changes to" scope selector inline when editing a recurring event and submits without a second popup', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const onClose = vi.fn();
    const onSubmitScopePayload = vi.fn<(payload: EventScopeRequestDTO) => void>();

    const recurringEvent: EventResponseDTO = {
      eventId: 5,
      taskId: 5,
      occurrenceId: '5_2026-10-26T18:00',
      title: 'Gym Session',
      description: 'Leg day',
      startTime: '2026-10-26T18:00:00',
      endTime: '2026-10-26T19:00:00',
      isFlexible: false,
      isPrivate: false,
      categories: [],
      recurrenceType: 'WEEKLY',
      recurrenceEndDate: null,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EventFormModal
            isOpen={true}
            onClose={onClose}
            event={recurringEvent}
            categories={SAMPLE_CATEGORIES}
            onSubmitScopePayload={onSubmitScopePayload}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );

    // "Apply changes to" section is rendered directly inside the form with "This event only" default selected
    expect(screen.getByText(/apply changes to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/this event only/i)).toBeChecked();

    // Choose "This and following events" inline
    await user.click(screen.getByLabelText(/this and following events/i));

    // Click "Save changes" once — submits directly without a second modal
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmitScopePayload).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitScopePayload).toHaveBeenCalledWith({
      scope: 'THIS_AND_FOLLOWING',
      fromDate: '2026-10-26',
      updateData: {
        title: 'Gym Session',
        description: 'Leg day',
        startTime: '2026-10-26T18:00:00',
        endTime: '2026-10-26T19:00:00',
        isFlexible: false,
        isPrivate: false,
        categoryIds: [],
        recurrenceType: 'WEEKLY',
        recurrenceEndDate: null,
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('expands Custom dates mini-calendar inline inside EventFormModal when "Custom dates..." is selected', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const onClose = vi.fn();
    const onSubmitScopePayload = vi.fn<(payload: EventScopeRequestDTO) => void>();

    const recurringEvent: EventResponseDTO = {
      eventId: 5,
      taskId: 5,
      occurrenceId: '5_2026-10-26T18:00',
      title: 'Gym Session',
      description: 'Leg day',
      startTime: '2026-10-26T18:00:00',
      endTime: '2026-10-26T19:00:00',
      isFlexible: false,
      isPrivate: false,
      categories: [],
      recurrenceType: 'WEEKLY',
      recurrenceEndDate: null,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EventFormModal
            isOpen={true}
            onClose={onClose}
            event={recurringEvent}
            categories={SAMPLE_CATEGORIES}
            onSubmitScopePayload={onSubmitScopePayload}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );

    // Select "Custom dates..." inline
    await user.click(screen.getByLabelText(/custom dates/i));

    // Use Quick-Select 2 occurrences
    await user.click(screen.getByRole('button', { name: /select next 2 occurrences/i }));

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmitScopePayload).toHaveBeenCalledTimes(1);
    });

    expect(onSubmitScopePayload).toHaveBeenCalledWith({
      scope: 'SELECTED',
      selectedDates: ['2026-10-26', '2026-11-02'],
      updateData: {
        title: 'Gym Session',
        description: 'Leg day',
        startTime: '2026-10-26T18:00:00',
        endTime: '2026-10-26T19:00:00',
        isFlexible: false,
        isPrivate: false,
        categoryIds: [],
        recurrenceType: 'WEEKLY',
        recurrenceEndDate: null,
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports Custom date selection and Quick-Select toolbar in RecurrenceScopeModal', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn<(payload: EventScopeRequestDTO) => void>();

    const recurringEvent: EventResponseDTO = {
      eventId: 7,
      taskId: 7,
      occurrenceId: '7_2026-10-26T09:00',
      title: 'Morning Sync',
      description: null,
      startTime: '2026-10-26T09:00:00',
      endTime: '2026-10-26T09:30:00',
      isFlexible: false,
      isPrivate: false,
      categories: [],
      recurrenceType: 'WEEKLY',
      recurrenceEndDate: null,
    };

    render(
      <RecurrenceScopeModal
        isOpen={true}
        onClose={vi.fn()}
        mode="delete"
        event={recurringEvent}
        onConfirm={onConfirm}
      />,
    );

    // Select Option 4: Custom
    await user.click(screen.getByLabelText(/custom \(pick dates to delete\/edit\)/i));

    // Click Quick-Select "4"
    await user.click(screen.getByRole('button', { name: /select next 4 occurrences/i }));

    // Confirm button should read "Delete 4 selected occurrences"
    const confirmBtn = screen.getByRole('button', {
      name: /delete 4 selected occurrences/i,
    });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith({
      scope: 'SELECTED',
      selectedDates: ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16'],
      updateData: null,
    });
  });
});
