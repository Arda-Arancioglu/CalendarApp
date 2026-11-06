import { useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  Dumbbell,
  PauseCircle,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { RoutineFormModal } from '../components/calendar/RoutineFormModal';
import {
  useActivateRoutine,
  useDeactivateRoutine,
  useDeleteRoutine,
  useRoutines,
} from '../hooks/useRoutines';
import { useToast } from '../hooks/useToast';
import { formatDate, toApiDate } from '../utils/date';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../utils/colors';
import { cn } from '../utils/cn';
import type { RoutineResponseDTO } from '../types/routine';

type FilterTab = 'all' | 'active' | 'passive';

interface RoutineCardProps {
  routine: RoutineResponseDTO;
  onEdit: (routine: RoutineResponseDTO) => void;
  onDeactivate: (routine: RoutineResponseDTO, stopDate: string) => void;
  onActivate: (routine: RoutineResponseDTO, activateDate: string) => void;
  onRequestDelete: (routine: RoutineResponseDTO) => void;
  isDeactivating: boolean;
  isActivating: boolean;
  isDeleting: boolean;
}

function RoutineCard({
  routine,
  onEdit,
  onDeactivate,
  onActivate,
  onRequestDelete,
  isDeactivating,
  isActivating,
  isDeleting,
}: RoutineCardProps) {
  const [todayStr] = useState(() => toApiDate(new Date()));
  const [actionDate, setActionDate] = useState(todayStr);

  const color = normalizeHexColor(routine.color ?? DEFAULT_EVENT_COLOR);
  const isBusy = isDeactivating || isActivating || isDeleting;

  return (
    <article
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-dark-border bg-dark-surface/75 p-5 transition-all hover:border-indigo-500/40 hover:bg-dark-surface"
      style={{
        boxShadow: `inset 0 2px 0 0 ${color}`,
      }}
    >
      <div>
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1"
              style={{
                backgroundColor: withAlpha(color, 0.15),
                color,
                borderColor: withAlpha(color, 0.3),
              }}
              aria-hidden="true"
            >
              <Repeat className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-zinc-50" title={routine.title}>
                {routine.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={routine.isActive ? 'emerald' : 'zinc'}>
                  {routine.isActive ? 'Active' : 'Passive'}
                </Badge>
                <Badge variant="indigo">{routine.cycleLength}-Day Cycle</Badge>
              </div>
            </div>
          </div>

          <div
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-dark-surface"
            style={{ backgroundColor: color }}
            title={`Color: ${color}`}
            aria-hidden="true"
          />
        </div>

        {/* Dates & Description */}
        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-zinc-400">
          {routine.description || 'No description provided.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
            <span>Started: {formatDate(routine.startDate) || routine.startDate}</span>
          </span>
          <span>•</span>
          <span>
            Ends:{' '}
            {routine.endDate ? formatDate(routine.endDate) || routine.endDate : 'Repeats forever'}
          </span>
        </div>

        {/* Cycle Days Preview */}
        <div className="mt-4 rounded-xl border border-dark-border/80 bg-dark-bg/60 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Cycle Schedule
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {routine.items && routine.items.length > 0 ? (
              routine.items.map((item, idx) => (
                <div
                  key={`${routine.routineId}-day-${item.dayIndex}-${idx}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-mono text-zinc-400">Day {item.dayIndex}:</span>
                  <span
                    className={cn(
                      'min-w-0 truncate font-medium',
                      item.isRestDay ? 'text-zinc-500 italic' : 'text-zinc-200',
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                    {item.isRestDay
                      ? 'Rest Day'
                      : item.startTime && item.endTime
                        ? `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`
                        : 'Anytime'}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-zinc-500">No cycle days configured.</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 border-t border-dark-border/80 pt-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full min-h-[38px] items-center justify-between gap-2 rounded-lg border border-dark-border bg-dark-bg/80 px-3 py-1.5 text-xs text-zinc-300 sm:w-auto sm:justify-start sm:text-sm">
            <span className="shrink-0 text-xs text-zinc-400">
              {routine.isActive ? 'Stop on:' : 'Start from:'}
            </span>
            <input
              type="date"
              aria-label={`${routine.title} effective date`}
              value={actionDate}
              disabled={isBusy}
              onChange={(e) => setActionDate(e.target.value)}
              className="min-h-[32px] sm:min-h-[34px] bg-transparent font-mono text-xs sm:text-sm text-zinc-100 focus:outline-none disabled:opacity-50"
            />
          </label>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onEdit(routine)}
              aria-label={`Edit ${routine.title}`}
              title="Edit routine"
              leftIcon={<Pencil className="h-3.5 w-3.5 text-zinc-300" aria-hidden="true" />}
            >
              Edit
            </Button>

            {routine.isActive ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={isBusy}
                isLoading={isDeactivating}
                onClick={() => onDeactivate(routine, actionDate)}
                leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={isBusy}
                isLoading={isActivating}
                onClick={() => onActivate(routine, actionDate)}
                leftIcon={<BellRing className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Activate
              </Button>
            )}

            <Button
              size="sm"
              variant="danger"
              disabled={isBusy}
              isLoading={isDeleting}
              onClick={() => onRequestDelete(routine)}
              aria-label={`Delete ${routine.title}`}
              title="Delete routine"
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RoutinesPage() {
  const toast = useToast();
  const {
    data: routines = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useRoutines();

  const deactivateMutation = useDeactivateRoutine();
  const activateMutation = useActivateRoutine();
  const deleteMutation = useDeleteRoutine();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineResponseDTO | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [routineToDelete, setRoutineToDelete] = useState<RoutineResponseDTO | null>(null);

  const activeRoutines = useMemo(() => routines.filter((r) => r.isActive), [routines]);
  const passiveRoutines = useMemo(() => routines.filter((r) => !r.isActive), [routines]);

  // Filtered by search query
  const filteredActive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeRoutines;
    return activeRoutines.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [activeRoutines, searchQuery]);

  const filteredPassive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return passiveRoutines;
    return passiveRoutines.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [passiveRoutines, searchQuery]);

  const handleDeactivate = async (routine: RoutineResponseDTO, stopDate: string) => {
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

  const handleActivate = async (routine: RoutineResponseDTO, activateDate: string) => {
    try {
      await activateMutation.mutateAsync({
        routineId: routine.routineId,
        params: { activateDate },
      });
      toast.success(
        `Re-activated "${routine.title}" starting ${formatDate(activateDate) || activateDate}`,
      );
    } catch {
      // Handled by global mutation error toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!routineToDelete) return;
    try {
      await deleteMutation.mutateAsync(routineToDelete.routineId);
      toast.success(`Deleted routine "${routineToDelete.title}"`);
      setRoutineToDelete(null);
    } catch {
      // Handled by global mutation error toast
    }
  };

  const totalCount = routines.length;
  const activeCount = activeRoutines.length;
  const passiveCount = passiveRoutines.length;

  return (
    <div>
      <PageHeader
        title="Routines"
        description="Manage your N-day cycle routines, pause active routines into passive history, or reactivate past routines from today."
        actions={
          <Button
            className="w-full sm:w-auto justify-center"
            onClick={() => {
              setEditingRoutine(null);
              setCreateOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            New routine
          </Button>
        }
      />

      {/* Filter Tabs & Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:w-auto sm:items-center sm:gap-2"
          role="tablist"
          aria-label="Routine status filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'all'}
            onClick={() => setFilterTab('all')}
            className={cn(
              'inline-flex items-center justify-center rounded-xl px-2 py-2 sm:px-3.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              filterTab === 'all'
                ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
            )}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'active'}
            onClick={() => setFilterTab('active')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              filterTab === 'active'
                ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Active ({activeCount})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'passive'}
            onClick={() => setFilterTab('passive')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              filterTab === 'passive'
                ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-200',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Passive ({passiveCount})</span>
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search routines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 sm:h-10.5 w-full rounded-xl border border-dark-border bg-dark-surface/60 pl-9 pr-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            aria-label="Search routines"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-indigo-400">
          <Spinner size="lg" label="Loading your routines" />
        </div>
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : routines.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" aria-hidden="true" />}
          title="No routines created yet"
          description="Create an N-day cycle routine (e.g. 4-day workout, study cycle) with dedicated rest days to project continuous schedules onto your calendar."
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Create first routine
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Active section */}
          {(filterTab === 'all' || filterTab === 'active') && (
            <section aria-labelledby="active-routines-heading">
              {filterTab === 'all' && (
                <div className="mb-3 flex items-center justify-between">
                  <h3
                    id="active-routines-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Active Routines ({filteredActive.length})
                  </h3>
                </div>
              )}

              {filteredActive.length === 0 ? (
                <div className="rounded-xl border border-dashed border-dark-border bg-dark-bg/40 p-6 text-center text-xs text-zinc-400">
                  {searchQuery ? 'No active routines match your search.' : 'No active routines right now.'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredActive.map((routine) => (
                    <RoutineCard
                      key={routine.routineId}
                      routine={routine}
                      onEdit={(r) => setEditingRoutine(r)}
                      onDeactivate={handleDeactivate}
                      onActivate={handleActivate}
                      onRequestDelete={(r) => setRoutineToDelete(r)}
                      isDeactivating={
                        deactivateMutation.isPending &&
                        deactivateMutation.variables?.routineId === routine.routineId
                      }
                      isActivating={
                        activateMutation.isPending &&
                        activateMutation.variables?.routineId === routine.routineId
                      }
                      isDeleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === routine.routineId
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Passive section */}
          {(filterTab === 'all' || filterTab === 'passive') && (
            <section aria-labelledby="passive-routines-heading">
              {filterTab === 'all' && (
                <div className="mb-3 flex items-center justify-between">
                  <h3
                    id="passive-routines-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Passive / Past Routines ({filteredPassive.length})
                  </h3>
                </div>
              )}

              {filteredPassive.length === 0 ? (
                <div className="rounded-xl border border-dashed border-dark-border bg-dark-bg/40 p-6 text-center text-xs text-zinc-400">
                  {searchQuery ? 'No passive routines match your search.' : 'No passive routines.'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPassive.map((routine) => (
                    <RoutineCard
                      key={routine.routineId}
                      routine={routine}
                      onEdit={(r) => setEditingRoutine(r)}
                      onDeactivate={handleDeactivate}
                      onActivate={handleActivate}
                      onRequestDelete={(r) => setRoutineToDelete(r)}
                      isDeactivating={
                        deactivateMutation.isPending &&
                        deactivateMutation.variables?.routineId === routine.routineId
                      }
                      isActivating={
                        activateMutation.isPending &&
                        activateMutation.variables?.routineId === routine.routineId
                      }
                      isDeleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === routine.routineId
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Routine Creator / Editor Modal */}
      <RoutineFormModal
        key={editingRoutine ? `edit_${editingRoutine.routineId}` : `create_${String(createOpen)}`}
        isOpen={createOpen || editingRoutine !== null}
        routine={editingRoutine}
        onClose={() => {
          setCreateOpen(false);
          setEditingRoutine(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={routineToDelete !== null}
        onClose={() => setRoutineToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Delete routine?"
        description={
          <span>
            Are you sure you want to permanently delete routine{' '}
            <strong className="text-zinc-100">"{routineToDelete?.title}"</strong>? All associated
            schedule occurrences will be permanently removed.
          </span>
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
