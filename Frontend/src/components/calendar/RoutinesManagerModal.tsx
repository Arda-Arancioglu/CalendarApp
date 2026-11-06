import { useState } from 'react';
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  PauseCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  useActivateRoutine,
  useDeactivateRoutine,
  useDeleteRoutine,
  useRoutines,
} from '../../hooks/useRoutines';
import { useToast } from '../../hooks/useToast';
import { formatDate, toApiDate } from '../../utils/date';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../../utils/colors';
import type { RoutineResponseDTO } from '../../types/routine';

export interface RoutinesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateRoutine?: () => void;
}

export function RoutinesManagerModal({
  isOpen,
  onClose,
  onOpenCreateRoutine,
}: RoutinesManagerModalProps) {
  const toast = useToast();
  const { data: routines = [], isLoading } = useRoutines();
  const deactivateMutation = useDeactivateRoutine();
  const activateMutation = useActivateRoutine();
  const deleteMutation = useDeleteRoutine();

  const [activeTab, setActiveTab] = useState<'active' | 'passive'>('active');
  const [actionDateById, setActionDateById] = useState<Record<number, string>>({});
  const [todayStr] = useState(() => toApiDate(new Date()));

  if (!isOpen) return null;

  const activeRoutines = routines.filter((r) => r.isActive);
  const passiveRoutines = routines.filter((r) => !r.isActive);

  const getSelectedDate = (routineId: number) =>
    actionDateById[routineId] ?? todayStr;

  const handleDeactivate = async (routine: RoutineResponseDTO) => {
    const stopDate = getSelectedDate(routine.routineId);
    try {
      await deactivateMutation.mutateAsync({
        routineId: routine.routineId,
        stopDate,
      });
      toast.success(
        `Deactivated "${routine.title}" as of ${formatDate(stopDate) || stopDate} (past sessions preserved)`,
      );
    } catch {
      // Handled by global mutation error toast
    }
  };

  const handleActivate = async (routine: RoutineResponseDTO) => {
    const activateDate = getSelectedDate(routine.routineId);
    try {
      await activateMutation.mutateAsync({
        routineId: routine.routineId,
        params: { activateDate },
      });
      toast.success(`Re-activated "${routine.title}" starting ${formatDate(activateDate) || activateDate}`);
    } catch {
      // Handled by global mutation error toast
    }
  };

  const handleDelete = async (routine: RoutineResponseDTO) => {
    try {
      await deleteMutation.mutateAsync(routine.routineId);
      toast.success(`Deleted routine "${routine.title}"`);
    } catch {
      // Handled by global mutation error toast
    }
  };

  const displayedList = activeTab === 'active' ? activeRoutines : passiveRoutines;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Cycle Routines" maxWidth="2xl">
      <div className="space-y-4">
        {/* Top Tabs + Create Routine Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-border pb-3">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Routine status tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                  : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Active Routines ({activeRoutines.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'passive'}
              onClick={() => setActiveTab('passive')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === 'passive'
                  ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                  : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200'
              }`}
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Passive / Finished ({passiveRoutines.length})</span>
            </button>
          </div>

          {onOpenCreateRoutine && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onClose();
                onOpenCreateRoutine();
              }}
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              New routine
            </Button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">
          {activeTab === 'active'
            ? 'Active routines automatically project their N-day cycle onto your calendar. Making a routine passive stops future sessions while preserving your past workout history.'
            : 'Passive routines are paused like a turned-off alarm. Re-activate any routine from today (or a chosen date) to resume its cycle on your calendar.'}
        </p>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading routines…</div>
        ) : displayedList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-border bg-dark-bg/40 p-8 text-center">
            <Dumbbell className="mx-auto h-7 w-7 text-zinc-500" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-zinc-200">
              {activeTab === 'active'
                ? 'No active routines right now'
                : 'No passive routines'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {activeTab === 'active'
                ? 'Create a new N-day cycle routine or re-activate one from the Passive tab.'
                : 'When you finish or pause an active routine, it will appear here so you can re-activate it anytime.'}
            </p>
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {displayedList.map((routine) => {
              const color = normalizeHexColor(routine.color ?? DEFAULT_EVENT_COLOR);
              const dateVal = getSelectedDate(routine.routineId);

              return (
                <div
                  key={routine.routineId}
                  className="rounded-xl border border-dark-border bg-dark-bg/50 p-4"
                  style={{
                    borderLeft: `4px solid ${color}`,
                    backgroundColor: withAlpha(color, 0.08),
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">{routine.title}</h3>
                        <Badge variant={routine.isActive ? 'emerald' : 'amber'}>
                          {routine.isActive ? 'Active' : 'Passive'}
                        </Badge>
                        <Badge variant="indigo">{routine.cycleLength}-Day Cycle</Badge>
                      </div>

                      {routine.description && (
                        <p className="mt-1 text-xs text-zinc-300">{routine.description}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                          Started: {formatDate(routine.startDate) || routine.startDate}
                        </span>
                        <span>
                          Ends:{' '}
                          {routine.endDate
                            ? formatDate(routine.endDate) || routine.endDate
                            : 'Repeats forever'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex min-h-[36px] items-center gap-2 rounded-lg border border-dark-border bg-dark-surface px-3 py-1 text-xs text-zinc-300 sm:text-sm">
                        <span>{routine.isActive ? 'Stop on:' : 'Start from:'}</span>
                        <input
                          type="date"
                          aria-label={`${routine.title} effective date`}
                          value={dateVal}
                          onChange={(e) =>
                            setActionDateById((prev) => ({
                              ...prev,
                              [routine.routineId]: e.target.value,
                            }))
                          }
                          className="min-h-[30px] bg-transparent font-mono text-xs sm:text-sm text-zinc-100 focus:outline-none"
                        />
                      </label>

                      {routine.isActive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={
                            deactivateMutation.isPending &&
                            deactivateMutation.variables?.routineId === routine.routineId
                          }
                          onClick={() => void handleDeactivate(routine)}
                          leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={
                            activateMutation.isPending &&
                            activateMutation.variables?.routineId === routine.routineId
                          }
                          onClick={() => void handleActivate(routine)}
                          leftIcon={<BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Activate from Today
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === routine.routineId
                        }
                        onClick={() => void handleDelete(routine)}
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end border-t border-dark-border pt-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
