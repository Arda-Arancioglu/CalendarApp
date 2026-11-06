import { useState } from 'react';
import { CalendarArrowUp, CalendarClock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useShiftRoutine } from '../../hooks/useRoutines';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/date';
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../../types/routine';

export interface ShiftConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: RoutineOccurrenceDTO | null;
  routine?: RoutineResponseDTO | null;
  onShiftSuccess?: () => void;
}

export function ShiftConfirmModal({
  isOpen,
  onClose,
  occurrence,
  routine,
  onShiftSuccess,
}: ShiftConfirmModalProps) {
  const toast = useToast();
  const shiftMutation = useShiftRoutine({ handlesErrorInline: true });

  const [shiftDate, setShiftDate] = useState<string>(() => occurrence?.startDate ?? '');
  const [shiftDays, setShiftDays] = useState<number>(1);
  const [extendEndDate, setExtendEndDate] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !occurrence) return null;

  const hasEndDate = Boolean(routine?.endDate);
  const effectiveShiftDate = shiftDate || occurrence.startDate;
  const safeDays = Math.max(1, shiftDays || 1);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!effectiveShiftDate) {
      setErrorMsg('Please select a shift date.');
      return;
    }

    try {
      await shiftMutation.mutateAsync({
        routineId: occurrence.routineId,
        dto: {
          shiftDate: effectiveShiftDate,
          shiftDays: safeDays,
          extendEndDate: hasEndDate ? extendEndDate : false,
        },
      });
      toast.success(
        `Shifted "${routine?.title ?? occurrence.title}" by +${safeDays} ${safeDays === 1 ? 'day' : 'days'}`,
      );
      onClose();
      onShiftSuccess?.();
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shift Routine Schedule"
      maxWidth="md"
    >
      <form onSubmit={(e) => void handleConfirm(e)} className="space-y-4">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs leading-relaxed text-zinc-200">
          <div className="flex items-center gap-2 font-semibold text-indigo-200">
            <CalendarArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Surgical Cycle Shift</span>
          </div>
          <p className="mt-1 text-zinc-300">
            Pushes <strong className="text-white">{routine?.title ?? occurrence.title}</strong>{' '}
            forward starting from the selected date so you never lose your place in the cycle.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
          >
            {errorMsg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Shift from date"
            type="date"
            value={effectiveShiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            required
          />

          <Input
            label="Shift by (+ days)"
            type="number"
            min={1}
            max={60}
            value={safeDays}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              setShiftDays(Number.isFinite(parsed) && parsed >= 1 ? parsed : 1);
            }}
            required
          />
        </div>

        {/* Quick +1 / +2 / +3 / +7 pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400">Quick shift:</span>
          {[1, 2, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setShiftDays(d)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                safeDays === d
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                  : 'border-dark-border bg-dark-bg/60 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              +{d} {d === 1 ? 'Day' : 'Days'}
            </button>
          ))}
        </div>

        {hasEndDate && routine?.endDate && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-border bg-dark-bg/60 p-3.5 transition-colors hover:border-indigo-500/40">
            <input
              type="checkbox"
              checked={extendEndDate}
              onChange={(e) => setExtendEndDate(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-dark-surface text-indigo-500 focus:ring-indigo-400"
            />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-zinc-100">
                Extend end date by +{safeDays} {safeDays === 1 ? 'day' : 'days'} so you do not miss the final routine session.
              </span>
              <p className="mt-0.5 flex items-center gap-1.5 text-zinc-400">
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden="true" />
                <span>Current end date: {formatDate(routine.endDate) || routine.endDate}</span>
              </p>
            </div>
          </label>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-dark-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={shiftMutation.isPending}
            leftIcon={<CalendarArrowUp className="h-4 w-4" aria-hidden="true" />}
          >
            Confirm Shift (+{safeDays}d)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
