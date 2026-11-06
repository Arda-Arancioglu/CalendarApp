import { request } from './client';
import type {
  RoutineActivateParams,
  RoutineOccurrenceDTO,
  RoutineOccurrencesRangeParams,
  RoutineRequestDTO,
  RoutineResponseDTO,
  RoutineShiftRequestDTO,
} from '../types/routine';

type RawRoutineResponseDTO = Omit<RoutineResponseDTO, 'isActive'> & {
  isActive?: boolean;
  active?: boolean;
};

function normalizeRoutine(raw: RawRoutineResponseDTO): RoutineResponseDTO {
  return {
    ...raw,
    items: Array.isArray(raw.items) ? raw.items : [],
    isActive: raw.isActive ?? raw.active ?? true,
  };
}

export async function createRoutine(dto: RoutineRequestDTO): Promise<RoutineResponseDTO> {
  const raw = await request<RawRoutineResponseDTO>('/routines', {
    method: 'POST',
    body: dto,
  });
  return normalizeRoutine(raw);
}

export async function updateRoutine(
  routineId: number,
  dto: RoutineRequestDTO,
): Promise<RoutineResponseDTO> {
  const raw = await request<RawRoutineResponseDTO>(`/routines/${routineId}`, {
    method: 'PUT',
    body: dto,
  });
  return normalizeRoutine(raw);
}

export async function getRoutines(signal?: AbortSignal): Promise<RoutineResponseDTO[]> {
  const list = await request<RawRoutineResponseDTO[]>('/routines', { signal });
  return list.map(normalizeRoutine);
}

export async function getRoutineOccurrences(
  params: RoutineOccurrencesRangeParams,
  signal?: AbortSignal,
): Promise<RoutineOccurrenceDTO[]> {
  return request<RoutineOccurrenceDTO[]>('/routines/occurrences', {
    query: {
      fromDate: params.fromDate,
      endDate: params.endDate,
    },
    signal,
  });
}

export async function shiftRoutine(
  routineId: number,
  dto: RoutineShiftRequestDTO,
): Promise<void> {
  await request<void>(`/routines/${routineId}/shift`, {
    method: 'POST',
    body: dto,
  });
}

export async function deleteRoutine(routineId: number): Promise<void> {
  await request<void>(`/routines/${routineId}`, {
    method: 'DELETE',
  });
}

export async function deactivateRoutine(
  routineId: number,
  stopDate?: string,
): Promise<RoutineResponseDTO> {
  const raw = await request<RawRoutineResponseDTO>(`/routines/${routineId}/deactivate`, {
    method: 'PATCH',
    query: stopDate ? { stopDate } : undefined,
  });
  return normalizeRoutine(raw);
}

export async function activateRoutine(
  routineId: number,
  params?: RoutineActivateParams,
): Promise<RoutineResponseDTO> {
  const raw = await request<RawRoutineResponseDTO>(`/routines/${routineId}/activate`, {
    method: 'PATCH',
    query: {
      activateDate: params?.activateDate,
      newEndDate: params?.newEndDate ?? undefined,
    },
  });
  return normalizeRoutine(raw);
}
