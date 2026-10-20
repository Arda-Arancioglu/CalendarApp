import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../../context/ToastProvider';
import { EventFormModal } from '../EventFormModal';
import type { CategoryResponseDTO } from '../../../types/category';
import type { EventRequestDTO } from '../../../types/event';

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
});
