import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../context/ToastProvider';
import { RoutineFormModal } from '../RoutineFormModal';
import { RoutineDetailModal } from '../RoutineDetailModal';
import { ExportCalendarModal } from '../ExportCalendarModal';
import { CompactScheduleView } from '../CompactScheduleViews';
import {
  buildCompressedTimeSegments,
  formatMinutes24,
  type UnifiedScheduleItem,
} from '../../../utils/scheduleCompression';
import type {
  RoutineOccurrenceDTO,
  RoutineRequestDTO,
  RoutineResponseDTO,
} from '../../../types/routine';

function withProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Phase 6 Routine, Export & Compact Schedule Views', () => {
  it('builds a multi-day cycle routine with Rest Day toggles in RoutineFormModal', async () => {
    const user = userEvent.setup();
    const onSubmitPayload = vi.fn<(payload: RoutineRequestDTO) => void>();
    const onClose = vi.fn();

    withProviders(
      <RoutineFormModal
        isOpen={true}
        onClose={onClose}
        defaultStartDate={new Date(2026, 10, 5)}
        onSubmitPayload={onSubmitPayload}
      />,
    );

    await user.type(screen.getByLabelText(/routine title/i), 'PPL Cycle');

    // Change cycle length to 3 days
    const cycleInput = screen.getByLabelText(/cycle length/i);
    await user.clear(cycleInput);
    await user.type(cycleInput, '3');

    // Mark Day 3 as a Rest Day
    const restDayCheckboxes = screen.getAllByRole('checkbox', { name: /rest day/i });
    expect(restDayCheckboxes).toHaveLength(3);
    if (restDayCheckboxes[2]) {
      await user.click(restDayCheckboxes[2]);
    }

    await user.click(screen.getByRole('button', { name: /create routine/i }));

    await waitFor(() => {
      expect(onSubmitPayload).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmitPayload.mock.calls[0]?.[0];
    expect(submitted?.title).toBe('PPL Cycle');
    expect(submitted?.cycleLength).toBe(3);
    expect(submitted?.items).toHaveLength(3);
    expect(submitted?.items[2]?.isRestDay).toBe(true);
    expect(submitted?.items[2]?.startTime).toBeNull();
  });

  it('shows RoutineDetailModal with Finish/Delete actions and opens ShiftConfirmModal', async () => {
    const user = userEvent.setup();
    const occurrence: RoutineOccurrenceDTO = {
      routineId: 12,
      routineItemId: 101,
      title: 'Push Day (Chest & Triceps)',
      description: 'Bench press + overhead press',
      startDate: '2026-11-05',
      startTime: '18:00:00',
      endTime: '19:30:00',
      color: '#6366F1',
      dayIndex: 0,
      isRestDay: false,
    };

    const routine: RoutineResponseDTO = {
      routineId: 12,
      title: 'Hypertrophy Block',
      description: '8-week cycle',
      cycleLength: 4,
      startDate: '2026-11-01',
      endDate: '2026-12-31',
      color: '#6366F1',
      isActive: true,
      items: [
        {
          dayIndex: 0,
          title: 'Push Day (Chest & Triceps)',
          description: 'Bench press',
          startTime: '18:00:00',
          endTime: '19:30:00',
          isRestDay: false,
        },
      ],
    };

    withProviders(
      <RoutineDetailModal
        occurrence={occurrence}
        routine={routine}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/day 1 of 4/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /deactivate/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete routine/i }),
    ).toBeInTheDocument();

    // Click "Shift Routine (+1 Day or custom)"
    await user.click(
      screen.getByRole('button', { name: /shift routine \(\+1 day or custom\)/i }),
    );

    // ShiftConfirmModal opens with the End Date Extension checkbox checked by default
    expect(screen.getByText(/surgical cycle shift/i)).toBeInTheDocument();
    const extendCheckbox = screen.getByRole('checkbox', {
      name: /extend end date by \+1 day/i,
    });
    expect(extendCheckbox).toBeChecked();
  });

  it('renders privacy mask, category colors, and custom 24h range controls in ExportCalendarModal', async () => {
    const user = userEvent.setup();
    const dummyRef = { current: document.createElement('div') };

    withProviders(
      <ExportCalendarModal
        isOpen={true}
        onClose={vi.fn()}
        calendarContainerRef={dummyRef}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: /mask private events/i }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /preserve user category colors/i }),
    ).toBeChecked();

    // Default export mode is full 24h (Hide inactive hours unchecked by default)
    const hideInactiveCheckbox = screen.getByRole('checkbox', {
      name: /hide inactive hours/i,
    });
    expect(hideInactiveCheckbox).not.toBeChecked();

    // Renamed layout buttons
    expect(screen.getByRole('button', { name: /standard view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /task view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compressed view/i })).toBeInTheDocument();

    // Checking "Hide inactive hours" reveals "Export from" and "Export until"
    await user.click(hideInactiveCheckbox);
    expect(hideInactiveCheckbox).toBeChecked();
    expect(screen.getByLabelText(/export from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/export until/i)).toBeInTheDocument();
  });

  it('computes elementary coordinate-compressed time segments for overlapping multi-day tasks', () => {
    // Monday: Task A (14:00-15:00 = 840-900) and Task B (16:00-17:00 = 960-1020)
    // Tuesday: Task C (14:30-18:00 = 870-1080)
    // Window: 14:00 (840) to 18:00 (1080)
    const sampleItems: UnifiedScheduleItem[] = [
      {
        id: 'a',
        kind: 'event',
        title: 'Task A',
        description: null,
        dateKey: '2026-11-02',
        startMin: 14 * 60,
        endMin: 15 * 60,
        color: '#6366F1',
        isFlexible: false,
        isPrivate: false,
        isRecurring: false,
        isStaged: false,
        categories: [],
      },
      {
        id: 'b',
        kind: 'event',
        title: 'Task B',
        description: null,
        dateKey: '2026-11-02',
        startMin: 16 * 60,
        endMin: 17 * 60,
        color: '#10B981',
        isFlexible: false,
        isPrivate: false,
        isRecurring: false,
        isStaged: false,
        categories: [],
      },
      {
        id: 'c',
        kind: 'event',
        title: 'Task C',
        description: null,
        dateKey: '2026-11-03',
        startMin: 14 * 60 + 30,
        endMin: 18 * 60,
        color: '#F59E0B',
        isFlexible: false,
        isPrivate: false,
        isRecurring: false,
        isStaged: false,
        categories: [],
      },
    ];

    const segments = buildCompressedTimeSegments(sampleItems, 14 * 60, 18 * 60);
    const formattedRanges = segments.map(
      (s) => `${formatMinutes24(s.startMin)}-${formatMinutes24(s.endMin)}`,
    );

    expect(formattedRanges).toEqual([
      '14:00-14:30',
      '14:30-15:00',
      '15:00-16:00',
      '16:00-17:00',
      '17:00-18:00',
    ]);
    expect(segments.every((s) => s.isActiveAcrossAnyDay)).toBe(true);
  });

  it('renders CompactScheduleView in both Equal-Height Cards and Coordinate-Compressed Grid modes', () => {
    const visibleDays = [new Date(2026, 10, 2), new Date(2026, 10, 3)];
    const events = [
      {
        eventId: 1,
        taskId: 1,
        title: 'Deep Work',
        description: 'Architecture',
        startTime: '2026-11-02T09:00:00',
        endTime: '2026-11-02T12:00:00',
        isFlexible: false,
        isPrivate: false,
        categories: [],
      },
      {
        eventId: 2,
        taskId: 2,
        title: 'Code Review',
        description: null,
        startTime: '2026-11-02T14:00:00',
        endTime: '2026-11-02T15:00:00',
        isFlexible: false,
        isPrivate: false,
        categories: [],
      },
    ];

    const { rerender } = render(
      <CompactScheduleView
        mode="cards"
        visibleDays={visibleDays}
        events={events}
        routineOccurrences={[]}
        routinesById={new Map()}
        visibleStartTime="08:00"
        visibleEndTime="18:00"
        onSelectEvent={vi.fn()}
        onSelectRoutineOccurrence={vi.fn()}
      />,
    );

    expect(screen.getByTestId('compact-cards-view')).toBeInTheDocument();
    expect(screen.getByText(/Free Time \(12:00 .* 14:00\)/i)).toBeInTheDocument();

    rerender(
      <CompactScheduleView
        mode="compressed"
        visibleDays={visibleDays}
        events={events}
        routineOccurrences={[]}
        routinesById={new Map()}
        visibleStartTime="08:00"
        visibleEndTime="18:00"
        onSelectEvent={vi.fn()}
        onSelectRoutineOccurrence={vi.fn()}
      />,
    );

    expect(screen.getByTestId('coordinate-compressed-grid')).toBeInTheDocument();
    expect(screen.getByText('Deep Work')).toBeInTheDocument();
  });

  it('pre-populates RoutineFormModal in edit mode and submits payload with Save Changes', async () => {
    const user = userEvent.setup();
    const onSubmitPayload = vi.fn<(payload: RoutineRequestDTO) => void>();
    const onClose = vi.fn();

    const existingRoutine: RoutineResponseDTO = {
      routineId: 99,
      title: 'Current Workout Split',
      description: 'Strength training',
      cycleLength: 3,
      startDate: '2026-11-01',
      endDate: '2026-12-31',
      color: '#10B981',
      isActive: true,
      items: [
        {
          dayIndex: 0,
          title: 'Upper Body A',
          description: 'Chest & back focus',
          startTime: '07:00:00',
          endTime: '08:30:00',
          isRestDay: false,
        },
        {
          dayIndex: 1,
          title: 'Lower Body A',
          description: 'Squats & hinges',
          startTime: '07:00:00',
          endTime: '08:30:00',
          isRestDay: false,
        },
        {
          dayIndex: 2,
          title: 'Rest Day',
          description: null,
          startTime: null,
          endTime: null,
          isRestDay: true,
        },
      ],
    };

    withProviders(
      <RoutineFormModal
        isOpen={true}
        onClose={onClose}
        routine={existingRoutine}
        onSubmitPayload={onSubmitPayload}
      />,
    );

    // Verify modal title is "Edit Routine"
    expect(screen.getByRole('heading', { name: /edit routine/i })).toBeInTheDocument();

    // Verify fields are pre-populated
    expect(screen.getByLabelText(/routine title/i)).toHaveValue('Current Workout Split');
    expect(screen.getByLabelText(/cycle length/i)).toHaveValue(3);
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-11-01');
    expect(screen.getByLabelText(/end date/i)).toHaveValue('2026-12-31');

    // Submit button should read "Save Changes"
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeInTheDocument();

    // Modify title
    const titleInput = screen.getByLabelText(/routine title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Workout Split');

    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSubmitPayload).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmitPayload.mock.calls[0]?.[0];
    expect(submitted?.title).toBe('Updated Workout Split');
    expect(submitted?.cycleLength).toBe(3);
    expect(submitted?.items[0]?.title).toBe('Upper Body A');
    expect(submitted?.items[2]?.isRestDay).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers Edit Routine from RoutineDetailModal', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    const occurrence: RoutineOccurrenceDTO = {
      routineId: 15,
      routineItemId: 201,
      title: 'Chest & Arms',
      description: 'Morning gym',
      startDate: '2026-11-06',
      startTime: '08:00:00',
      endTime: '09:00:00',
      color: '#6366F1',
      dayIndex: 0,
      isRestDay: false,
    };

    const routine: RoutineResponseDTO = {
      routineId: 15,
      title: 'Strength Block',
      description: null,
      cycleLength: 2,
      startDate: '2026-11-01',
      endDate: null,
      color: '#6366F1',
      isActive: true,
      items: [
        {
          dayIndex: 0,
          title: 'Chest & Arms',
          description: null,
          startTime: '08:00:00',
          endTime: '09:00:00',
          isRestDay: false,
        },
        {
          dayIndex: 1,
          title: 'Rest Day',
          description: null,
          startTime: null,
          endTime: null,
          isRestDay: true,
        },
      ],
    };

    withProviders(
      <RoutineDetailModal
        occurrence={occurrence}
        routine={routine}
        onClose={vi.fn()}
        onEdit={onEdit}
      />,
    );

    const editBtn = screen.getByRole('button', { name: /edit routine/i });
    expect(editBtn).toBeInTheDocument();

    await user.click(editBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(routine);
  });
});
