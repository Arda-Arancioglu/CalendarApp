import { useState } from 'react';
import { Dumbbell, Moon, Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Time24Input } from '../ui/Time24Input';
import { Textarea } from '../ui/Textarea';
import { Toggle } from '../ui/Toggle';
import { useCreateRoutine, useUpdateRoutine } from '../../hooks/useRoutines';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errors';
import { toApiDate } from '../../utils/date';
import { CATEGORY_COLOR_PRESETS, DEFAULT_EVENT_COLOR } from '../../utils/colors';
import type { RoutineItemDTO, RoutineRequestDTO, RoutineResponseDTO } from '../../types/routine';

export interface RoutineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: Date | null;
  routine?: RoutineResponseDTO | null;
  onSubmitPayload?: (payload: RoutineRequestDTO) => void;
}

interface DayDraft {
  dayIndex: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isRestDay: boolean;
}

function createInitialDayDrafts(length: number): DayDraft[] {
  return Array.from({ length }, (_, idx) => ({
    dayIndex: idx,
    title: `Day ${idx + 1} Session`,
    description: '',
    startTime: '18:00',
    endTime: '19:00',
    isRestDay: false,
  }));
}

function normalizeTimeForApi(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function mapItemsToDayDrafts(cycleLength: number, items?: RoutineItemDTO[]): DayDraft[] {
  const itemMap = new Map((items ?? []).map((it) => [it.dayIndex, it]));
  return Array.from({ length: cycleLength }, (_, idx) => {
    const item = itemMap.get(idx);
    if (item) {
      return {
        dayIndex: idx,
        title: item.title ?? `Day ${idx + 1} Session`,
        description: item.description ?? '',
        startTime: item.startTime ? item.startTime.slice(0, 5) : '18:00',
        endTime: item.endTime ? item.endTime.slice(0, 5) : '19:00',
        isRestDay: Boolean(item.isRestDay),
      };
    }
    return {
      dayIndex: idx,
      title: `Day ${idx + 1} Session`,
      description: '',
      startTime: '18:00',
      endTime: '19:00',
      isRestDay: false,
    };
  });
}

interface RoutineFormInnerProps {
  onClose: () => void;
  defaultStartDate?: Date | null;
  routine?: RoutineResponseDTO | null;
  onSubmitPayload?: (payload: RoutineRequestDTO) => void;
}

function RoutineFormInner({
  onClose,
  defaultStartDate,
  routine,
  onSubmitPayload,
}: RoutineFormInnerProps) {
  const isEditMode = Boolean(routine);
  const toast = useToast();
  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();

  const [title, setTitle] = useState(() => routine?.title ?? '');
  const [description, setDescription] = useState(() => routine?.description ?? '');
  const [color, setColor] = useState<string>(
    () => routine?.color ?? CATEGORY_COLOR_PRESETS[0]?.hex ?? DEFAULT_EVENT_COLOR,
  );
  const [cycleLength, setCycleLength] = useState<number>(() => routine?.cycleLength ?? 4);
  const [cycleLengthInput, setCycleLengthInput] = useState<string>(() =>
    String(routine?.cycleLength ?? 4),
  );
  const [startDate, setStartDate] = useState<string>(() =>
    routine?.startDate ?? toApiDate(defaultStartDate ?? new Date()),
  );
  const [repeatForever, setRepeatForever] = useState<boolean>(() => !routine?.endDate);
  const [endDate, setEndDate] = useState<string>(() => routine?.endDate ?? '');
  const [days, setDays] = useState<DayDraft[]>(() =>
    routine ? mapItemsToDayDrafts(routine.cycleLength, routine.items) : createInitialDayDrafts(4),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCycleLengthChange = (nextLenRaw: number) => {
    const nextLen = Math.max(1, Math.min(21, nextLenRaw));
    setCycleLength(nextLen);
    setDays((prev) => {
      if (nextLen <= prev.length) {
        return prev.slice(0, nextLen);
      }
      const added: DayDraft[] = [];
      for (let idx = prev.length; idx < nextLen; idx++) {
        added.push({
          dayIndex: idx,
          title: `Day ${idx + 1} Session`,
          description: '',
          startTime: '18:00',
          endTime: '19:00',
          isRestDay: false,
        });
      }
      return [...prev, ...added];
    });
  };

  const updateDay = (dayIndex: number, patch: Partial<DayDraft>) => {
    setDays((prev) =>
      prev.map((d) => (d.dayIndex === dayIndex ? { ...d, ...patch } : d)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Routine title is required.');
      return;
    }

    if (!startDate) {
      setErrorMsg('Start date is required.');
      return;
    }

    if (!repeatForever && !endDate) {
      setErrorMsg('Please select an end date or enable Repeat Forever.');
      return;
    }

    if (!repeatForever && endDate < startDate) {
      setErrorMsg('End date must be on or after the start date.');
      return;
    }

    for (const day of days) {
      if (!day.isRestDay) {
        if (!day.title.trim()) {
          setErrorMsg(
            `Day ${day.dayIndex + 1} requires a session title (or mark it as a Rest Day).`,
          );
          return;
        }
        if (!day.startTime || !day.endTime || day.endTime <= day.startTime) {
          setErrorMsg(`Day ${day.dayIndex + 1} end time must be after start time.`);
          return;
        }
      }
    }

    const items: RoutineItemDTO[] = days.map((d) => ({
      dayIndex: d.dayIndex,
      title: d.isRestDay ? 'Rest Day' : d.title.trim(),
      description: d.description.trim() ? d.description.trim() : null,
      startTime: d.isRestDay ? null : normalizeTimeForApi(d.startTime),
      endTime: d.isRestDay ? null : normalizeTimeForApi(d.endTime),
      isRestDay: d.isRestDay,
    }));

    const payload: RoutineRequestDTO = {
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
      cycleLength,
      startDate,
      endDate: repeatForever ? null : endDate,
      color,
      items,
    };

    if (onSubmitPayload) {
      onSubmitPayload(payload);
      onClose();
      return;
    }

    try {
      if (routine) {
        await updateRoutineMutation.mutateAsync({
          routineId: routine.routineId,
          dto: payload,
        });
        toast.success(`Updated "${trimmedTitle}"`);
      } else {
        await createRoutineMutation.mutateAsync(payload);
        toast.success(`Created "${trimmedTitle}" (${cycleLength}-day cycle)`);
      }
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
        >
          {errorMsg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              label="Routine title"
              placeholder="e.g. Push / Pull / Legs / Rest"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <Input
            label="Cycle length (N days)"
            type="number"
            min={1}
            max={21}
            value={cycleLengthInput}
            onChange={(e) => {
              const raw = e.target.value;
              setCycleLengthInput(raw);
              const parsed = Number.parseInt(raw, 10);
              if (Number.isFinite(parsed) && parsed >= 1) {
                handleCycleLengthChange(parsed);
              }
            }}
            onBlur={() => {
              setCycleLengthInput(String(cycleLength));
            }}
            required
          />
        </div>

        <Textarea
          label="Description (optional)"
          placeholder="Notes or goals for this cycle routine…"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Color picker row */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">Routine color</label>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_COLOR_PRESETS.map((preset) => {
              const isSelected = color.toUpperCase() === preset.hex.toUpperCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  aria-label={`Select color ${preset.name}`}
                  title={preset.name}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    isSelected
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-dark-surface'
                      : 'ring-1 ring-white/20 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                />
              );
            })}
            <input
              type="color"
              aria-label="Custom routine color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="color-wheel-input h-7 w-7 cursor-pointer rounded-full ring-1 ring-white/25"
            />
          </div>
        </div>

        {/* Start Date & End Date */}
        <div className="grid gap-4 rounded-xl border border-dark-border bg-dark-bg/40 p-3.5 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <div className="space-y-2">
            <Toggle
              checked={repeatForever}
              onChange={(checked) => setRepeatForever(checked)}
              label="Repeat forever"
              description="Uncheck to set a final end date"
            />
            {!repeatForever && (
              <Input
                label="End date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            )}
          </div>
        </div>

        {/* N-Day Cycle Builder */}
        <div className="space-y-2.5">
          <div className="flex items-center">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Dumbbell className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              <span>Cycle Day Builder (Days 1 – {cycleLength})</span>
            </span>
          </div>

          <div className="max-h-[50dvh] space-y-2.5 overflow-y-auto pr-1 sm:max-h-[420px]">
            {days.map((day) => (
              <div
                key={day.dayIndex}
                className={`rounded-xl border p-3 transition-colors ${
                  day.isRestDay
                    ? 'border-dark-border/60 bg-dark-bg/30 opacity-75'
                    : 'border-dark-border bg-dark-bg/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
                    <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] text-indigo-200">
                      Day {day.dayIndex + 1}
                    </span>
                    {day.isRestDay && (
                      <span className="inline-flex items-center gap-1 text-zinc-400">
                        <Moon className="h-3 w-3" aria-hidden="true" /> Rest Day
                      </span>
                    )}
                  </span>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={day.isRestDay}
                      onChange={(e) =>
                        updateDay(day.dayIndex, { isRestDay: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-zinc-600 bg-dark-surface text-indigo-500 focus:ring-indigo-400"
                    />
                    <span>Rest Day</span>
                  </label>
                </div>

                {!day.isRestDay && (
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                    <div className="sm:col-span-2">
                      <Input
                        label={`Day ${day.dayIndex + 1} title`}
                        placeholder="e.g. Push Day (Chest & Triceps)"
                        value={day.title}
                        onChange={(e) =>
                          updateDay(day.dayIndex, { title: e.target.value })
                        }
                      />
                    </div>
                    <Time24Input
                      label={`Day ${day.dayIndex + 1} start`}
                      value={day.startTime}
                      onChange={(nextTime) =>
                        updateDay(day.dayIndex, { startTime: nextTime })
                      }
                    />
                    <Time24Input
                      label={`Day ${day.dayIndex + 1} end`}
                      value={day.endTime}
                      onChange={(nextTime) =>
                        updateDay(day.dayIndex, { endTime: nextTime })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-dark-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={
              isEditMode ? updateRoutineMutation.isPending : createRoutineMutation.isPending
            }
            leftIcon={
              isEditMode ? (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Dumbbell className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {isEditMode ? 'Save Changes' : 'Create Routine'}
          </Button>
        </div>
      </form>
  );
}

export function RoutineFormModal({
  isOpen,
  onClose,
  defaultStartDate,
  routine,
  onSubmitPayload,
}: RoutineFormModalProps) {
  if (!isOpen) return null;

  const isEditMode = Boolean(routine);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Routine' : 'New Cycle Routine'}
      maxWidth="3xl"
    >
      <RoutineFormInner
        key={
          routine
            ? `edit_${routine.routineId}`
            : `create_${defaultStartDate ? String(defaultStartDate.getTime()) : 'today'}`
        }
        onClose={onClose}
        defaultStartDate={defaultStartDate}
        routine={routine}
        onSubmitPayload={onSubmitPayload}
      />
    </Modal>
  );
}
