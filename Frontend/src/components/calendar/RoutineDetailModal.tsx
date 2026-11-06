import { useState } from 'react';
import {
  CalendarArrowUp,
  CalendarClock,
  Dumbbell,
  FileText,
  Layers,
  PauseCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ShiftConfirmModal } from './ShiftConfirmModal';
import { RoutineFormModal } from './RoutineFormModal';
import { useDeactivateRoutine, useDeleteRoutine } from '../../hooks/useRoutines';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/date';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../../utils/colors';
import type { RoutineOccurrenceDTO, RoutineResponseDTO } from '../../types/routine';

export interface RoutineDetailModalProps {
  occurrence: RoutineOccurrenceDTO | null;
  routine?: RoutineResponseDTO | null;
  onClose: () => void;
  onEdit?: (routine: RoutineResponseDTO) => void;
}

function formatLocalTimeRange(startTime: string | null, endTime: string | null): string {
  const trimSeconds = (t: string | null) => (t ? t.slice(0, 5) : '--:--');
  return `${trimSeconds(startTime)} → ${trimSeconds(endTime)}`;
}

export function RoutineDetailModal({
  occurrence,
  routine,
  onClose,
  onEdit,
}: RoutineDetailModalProps) {
  const toast = useToast();
  const deactivateMutation = useDeactivateRoutine();
  const deleteMutation = useDeleteRoutine();

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editRoutineOpen, setEditRoutineOpen] = useState(false);

  if (!occurrence) return null;

  const color = normalizeHexColor(occurrence.color ?? routine?.color ?? DEFAULT_EVENT_COLOR);
  const cycleLength = routine?.cycleLength;
  const dayNumber = occurrence.dayIndex + 1;
  const cycleLabel = cycleLength
    ? `Day ${dayNumber} of ${cycleLength}`
    : `Day ${dayNumber}`;

  const handleFinishRoutine = async () => {
    try {
      await deactivateMutation.mutateAsync({
        routineId: occurrence.routineId,
        stopDate: occurrence.startDate,
      });
      toast.success(
        `Finished "${routine?.title ?? occurrence.title}" as of ${formatDate(occurrence.startDate) || occurrence.startDate}`,
      );
      onClose();
    } catch {
      // Handled by global mutation toast
    }
  };

  const handleDeleteRoutine = async () => {
    try {
      await deleteMutation.mutateAsync(occurrence.routineId);
      toast.success(`Deleted routine "${routine?.title ?? occurrence.title}"`);
      setConfirmDeleteOpen(false);
      onClose();
    } catch {
      // Handled by global mutation toast
    }
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Routine session details" maxWidth="md">
        <div className="space-y-5">
          {/* Header Card */}
          <div
            className="rounded-xl border-l-4 p-4"
            style={{
              borderLeftColor: color,
              backgroundColor: withAlpha(color, 0.16),
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="indigo">
                <Dumbbell className="h-3 w-3" aria-hidden="true" />
                <span>Routine · {cycleLabel}</span>
              </Badge>
              {routine && (
                <Badge variant={routine.isActive ? 'emerald' : 'amber'}>
                  {routine.isActive ? 'Active' : 'Passive'}
                </Badge>
              )}
              {routine?.title && routine.title !== occurrence.title && (
                <span className="text-xs font-medium text-zinc-300">{routine.title}</span>
              )}
            </div>

            <h3 className="mt-2 text-lg font-semibold text-zinc-50">{occurrence.title}</h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-200">
              <CalendarClock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <span>
                {formatDate(occurrence.startDate) || occurrence.startDate} ·{' '}
                {formatLocalTimeRange(occurrence.startTime, occurrence.endTime)}
              </span>
            </div>
          </div>

          {/* Cycle Day Description */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Session description</span>
            </div>
            {occurrence.description || routine?.description ? (
              <p className="whitespace-pre-wrap rounded-xl border border-dark-border bg-dark-bg/50 p-3 text-sm leading-relaxed text-zinc-200">
                {occurrence.description || routine?.description}
              </p>
            ) : (
              <p className="text-sm italic text-zinc-500">No session description</p>
            )}
          </div>

          {/* Cycle Schedule Overview */}
          {routine && routine.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{routine.cycleLength}-Day Cycle Plan</span>
                </span>
                {routine.endDate && (
                  <span className="text-[11px] normal-case text-zinc-400">
                    Ends {formatDate(routine.endDate) || routine.endDate}
                  </span>
                )}
              </div>
              <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-xl border border-dark-border bg-dark-bg/40 p-2.5">
                {routine.items
                  .slice()
                  .sort((a, b) => a.dayIndex - b.dayIndex)
                  .map((item) => {
                    const isCurrentDay = item.dayIndex === occurrence.dayIndex;
                    return (
                      <div
                        key={item.dayIndex}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                          isCurrentDay
                            ? 'border border-indigo-400/40 bg-indigo-500/15 font-semibold text-indigo-100'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span className="truncate">
                          Day {item.dayIndex + 1}: {item.isRestDay ? 'Rest Day 💤' : item.title}
                        </span>
                        {!item.isRestDay && (
                          <span className="ml-2 shrink-0 font-mono text-[11px] text-zinc-400">
                            {formatLocalTimeRange(item.startTime, item.endTime)}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Lifecycle & Surgical Shift Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              >
                Delete Routine
              </Button>

              <Button
                variant="secondary"
                size="sm"
                isLoading={deactivateMutation.isPending}
                onClick={() => void handleFinishRoutine()}
                leftIcon={<PauseCircle className="h-4 w-4 text-amber-300" aria-hidden="true" />}
              >
                Deactivate
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (onEdit && routine) {
                    onEdit(routine);
                  } else {
                    setEditRoutineOpen(true);
                  }
                }}
                disabled={!routine}
                leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Edit Routine
              </Button>

              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShiftModalOpen(true)}
                leftIcon={<CalendarArrowUp className="h-4 w-4" aria-hidden="true" />}
              >
                Shift Routine (+1 Day or custom)
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {routine && (
        <RoutineFormModal
          isOpen={editRoutineOpen}
          routine={routine}
          onClose={() => setEditRoutineOpen(false)}
        />
      )}

      <ShiftConfirmModal
        key={`${occurrence.routineId}_${occurrence.startDate}_${String(shiftModalOpen)}`}
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        occurrence={occurrence}
        routine={routine}
        onShiftSuccess={onClose}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDeleteRoutine()}
        title="Delete routine permanently?"
        confirmLabel="Delete routine"
        isLoading={deleteMutation.isPending}
        description={
          <p>
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-zinc-100">
              {routine?.title ?? occurrence.title}
            </span>
            ? If you only want to stop future sessions while keeping past workouts on your calendar,
            use <strong>Deactivate</strong> instead.
          </p>
        }
      />
    </>
  );
}
