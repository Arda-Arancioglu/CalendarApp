import type { EventResponseDTO } from '../types/event';
import type { RoutineOccurrenceDTO } from '../types/routine';

export type ScheduleLayoutMode = 'standard' | 'cards' | 'compressed';

export interface UnifiedScheduleItem {
  id: string;
  kind: 'event' | 'routine';
  title: string;
  description: string | null;
  emoji?: string | null;
  dateKey: string; // 'YYYY-MM-DD'
  startMin: number; // minutes from 00:00 (0..1440)
  endMin: number; // minutes from 00:00 (0..1440)
  color: string;
  isFlexible: boolean;
  isPrivate: boolean;
  isRecurring: boolean;
  isStaged: boolean;
  routineDayLabel?: string;
  categories: { categoryId: number; name: string; color: string }[];
  eventDto?: EventResponseDTO;
  routineOccurrence?: RoutineOccurrenceDTO;
}

export interface CompressedSegment {
  index: number;
  startMin: number;
  endMin: number;
  isActiveAcrossAnyDay: boolean;
}

export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return 0;
  const h = Number.parseInt(match[1] ?? '0', 10);
  const m = Number.parseInt(match[2] ?? '0', 10);
  if (h === 24 && m === 0) return 1440;
  return Math.max(0, Math.min(1440, h * 60 + m));
}

export function formatMinutes24(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(totalMinutes)));
  if (clamped === 1440) return '24:00';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Pure coordinate-compression algorithm for Compact Variety 2:
 * Collects all unique start/end cut points across all visible days within `[minWindow, maxWindow]`,
 * sorts them ascending, and produces elementary intervals `[t_i, t_{i+1}]` tagged with whether
 * any day has an active task covering that segment.
 */
export function buildCompressedTimeSegments(
  items: UnifiedScheduleItem[],
  minWindow: number,
  maxWindow: number,
): CompressedSegment[] {
  const safeMin = Math.max(0, Math.min(1439, minWindow));
  const safeMax = Math.max(safeMin + 1, Math.min(1440, maxWindow));

  const cutSet = new Set<number>([safeMin, safeMax]);
  for (const item of items) {
    const clampedStart = Math.max(safeMin, Math.min(safeMax, item.startMin));
    const clampedEnd = Math.max(safeMin, Math.min(safeMax, item.endMin));
    if (clampedEnd > clampedStart) {
      cutSet.add(clampedStart);
      cutSet.add(clampedEnd);
    }
  }

  const cuts = Array.from(cutSet).sort((a, b) => a - b);
  const segments: CompressedSegment[] = [];

  for (let i = 0; i < cuts.length - 1; i++) {
    const startMin = cuts[i]!;
    const endMin = cuts[i + 1]!;
    if (endMin <= startMin) continue;

    const isActiveAcrossAnyDay = items.some((it) => {
      const s = Math.max(safeMin, Math.min(safeMax, it.startMin));
      const e = Math.max(safeMin, Math.min(safeMax, it.endMin));
      return e > s && s < endMin && e > startMin;
    });

    segments.push({
      index: segments.length,
      startMin,
      endMin,
      isActiveAcrossAnyDay,
    });
  }

  return segments;
}
