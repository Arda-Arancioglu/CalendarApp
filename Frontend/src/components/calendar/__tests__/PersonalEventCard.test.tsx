import type { EventContentArg } from '@fullcalendar/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventResponseDTO } from '../../../types/event';
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../../../types/routine';
import { PersonalEventCard } from '../PersonalEventCard';

function createMockEventArg(options: {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  timeText?: string;
  viewType?: string;
  dto?: Partial<EventResponseDTO>;
  kind?: 'event' | 'routine';
  routineOccurrence?: Partial<RoutineOccurrenceDTO>;
  routine?: Partial<RoutineResponseDTO>;
  isStaged?: boolean;
}): EventContentArg {
  const {
    id = 'evt_1',
    title,
    start,
    end,
    timeText = '10:00 - 10:30',
    viewType = 'timeGridWeek',
    dto,
    kind = 'event',
    routineOccurrence,
    routine,
    isStaged = false,
  } = options;

  const fullDto: EventResponseDTO | undefined =
    kind === 'event'
      ? {
          eventId: 1,
          title,
          description: dto?.description ?? 'Detailed description of the task',
          emoji: dto && 'emoji' in dto ? dto.emoji : '💼',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          isFlexible: dto?.isFlexible ?? false,
          isPrivate: dto?.isPrivate ?? false,
          categories: dto && 'categories' in dto ? (dto.categories ?? []) : [
            { categoryId: 10, name: 'Work', color: '#6366F1' },
            { categoryId: 11, name: 'Urgent', color: '#EF4444' },
          ],
          ...dto,
        }
      : undefined;

  return {
    event: {
      id,
      title,
      start,
      end,
      extendedProps: {
        kind,
        primaryColor: '#6366F1',
        isStaged,
        dto: fullDto,
        routineOccurrence: routineOccurrence
          ? {
              routineId: 1,
              routineItemId: 1,
              dayIndex: 0,
              title,
              description: 'Push workout routine description',
              startTime: '10:00',
              endTime: '10:30',
              startDate: '2026-11-06',
              isRestDay: false,
              color: '#8B5CF6',
              ...routineOccurrence,
            }
          : undefined,
        routine: routine
          ? {
              routineId: 1,
              title: 'PPL Routine',
              cycleLength: 3,
              startDate: '2026-11-01',
              color: '#8B5CF6',
              items: [],
              createdAt: '2026-11-01T00:00:00',
              updatedAt: '2026-11-01T00:00:00',
              ...routine,
            }
          : undefined,
      },
    },
    timeText,
    view: {
      type: viewType,
    },
  } as unknown as EventContentArg;
}

describe('PersonalEventCard Micro-Badge & Adaptive Layout', () => {
  it('Priority 1 (Emoji): renders emoji micro-badge, subtle time hint, tooltip, and no description/categories in short mode', () => {
    const start = new Date(2026, 10, 6, 8, 30);
    const end = new Date(2026, 10, 6, 9, 0); // 30 mins

    const arg = createMockEventArg({
      title: 'Göz damlası',
      start,
      end,
      timeText: '08:30 - 09:00',
      dto: {
        emoji: '💊',
        description: 'Take eye drops on schedule',
        categories: [{ categoryId: 1, name: 'Health', color: '#10B981' }],
      },
    });

    render(<PersonalEventCard arg={arg} />);

    // Priority 1: Emoji is rendered
    expect(screen.getByText('💊')).toBeInTheDocument();

    // Subtle time hint (start time "08:30") is present
    expect(screen.getAllByText('08:30').length).toBeGreaterThanOrEqual(1);

    // Hover tooltip contains the full time span and title
    expect(screen.getByText('08:30 - 09:00')).toBeInTheDocument();
    expect(screen.getAllByText(/Göz damlası/).length).toBeGreaterThanOrEqual(1);

    // Short mode hides description and categories to avoid collisions
    expect(screen.queryByText('Take eye drops on schedule')).not.toBeInTheDocument();
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
  });

  it('Priority 2 (Category Initial): renders first letter of category name when no emoji is present', () => {
    const start = new Date(2026, 10, 6, 10, 0);
    const end = new Date(2026, 10, 6, 10, 30);

    const arg = createMockEventArg({
      title: 'Weekly Sync',
      start,
      end,
      timeText: '10:00 - 10:30',
      dto: {
        emoji: null,
        categories: [{ categoryId: 2, name: 'Work', color: '#6366F1' }],
      },
    });

    render(<PersonalEventCard arg={arg} />);

    // First letter of category "Work" is "W"
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByTitle('Work')).toBeInTheDocument();
  });

  it('Priority 3 (Title Initial): renders first letter of event title when no emoji and no categories exist', () => {
    const start = new Date(2026, 10, 6, 11, 0);
    const end = new Date(2026, 10, 6, 11, 30);

    const arg = createMockEventArg({
      title: 'Meditation',
      start,
      end,
      timeText: '11:00 - 11:30',
      dto: {
        emoji: null,
        categories: [],
      },
    });

    render(<PersonalEventCard arg={arg} />);

    // First letter of "Meditation" is "M"
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders a full multi-line layout for standard events (60 mins) including description and category badges', () => {
    const start = new Date(2026, 10, 6, 14, 0);
    const end = new Date(2026, 10, 6, 15, 0); // 60 minutes -> isShort = false

    const arg = createMockEventArg({
      title: 'Quarterly Planning',
      start,
      end,
      timeText: '14:00 - 15:00',
      dto: {
        emoji: '📊',
        description: 'Discuss Q4 roadmaps and KPIs',
        categories: [
          { categoryId: 1, name: 'Strategy', color: '#6366F1' },
          { categoryId: 2, name: 'Executive', color: '#8B5CF6' },
        ],
      },
    });

    render(<PersonalEventCard arg={arg} />);

    expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
    expect(screen.getByText(/Quarterly Planning/)).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('Discuss Q4 roadmaps and KPIs')).toBeInTheDocument();
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });

  it('renders compact micro-badge layout for short routine occurrences without description', () => {
    const start = new Date(2026, 10, 6, 8, 0);
    const end = new Date(2026, 10, 6, 8, 30); // 30 minutes

    const arg = createMockEventArg({
      title: 'Morning Cardio',
      start,
      end,
      timeText: '08:00 - 08:30',
      kind: 'routine',
      routineOccurrence: {
        dayIndex: 0,
        description: 'Treadmill interval sprints',
      },
      routine: {
        cycleLength: 4,
      },
    });

    render(<PersonalEventCard arg={arg} />);

    expect(screen.getAllByText('08:00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Morning Cardio/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Treadmill interval sprints')).not.toBeInTheDocument();
  });

  it('renders multi-line layout with description for standard routine occurrences (>45 mins)', () => {
    const start = new Date(2026, 10, 6, 8, 0);
    const end = new Date(2026, 10, 6, 9, 30); // 90 minutes

    const arg = createMockEventArg({
      title: 'Heavy Leg Day',
      start,
      end,
      timeText: '08:00 - 09:30',
      kind: 'routine',
      routineOccurrence: {
        dayIndex: 1,
        description: 'Squats, lunges, and calf raises',
      },
      routine: {
        cycleLength: 3,
      },
    });

    render(<PersonalEventCard arg={arg} />);

    expect(screen.getByText('08:00 - 09:30')).toBeInTheDocument();
    expect(screen.getByText('Heavy Leg Day')).toBeInTheDocument();
    expect(screen.getByText('Day 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Squats, lunges, and calf raises')).toBeInTheDocument();
  });

  it('renders single-line horizontal card in month view (dayGridMonth)', () => {
    const start = new Date(2026, 10, 6, 10, 0);
    const end = new Date(2026, 10, 6, 11, 0);

    const arg = createMockEventArg({
      title: 'Doctor Appointment',
      start,
      end,
      timeText: '10:00',
      viewType: 'dayGridMonth',
      dto: {
        emoji: '🩺',
      },
    });

    render(<PersonalEventCard arg={arg} />);

    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText(/Doctor Appointment/)).toBeInTheDocument();
    expect(screen.getByText('🩺')).toBeInTheDocument();
  });
});
