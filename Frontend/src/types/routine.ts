export interface RoutineItemDTO {
  dayIndex: number;
  title: string;
  description?: string | null;
  startTime: string | null;
  endTime: string | null;
  isRestDay: boolean;
}

export interface RoutineRequestDTO {
  title: string;
  description?: string | null;
  cycleLength: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string | null; // 'YYYY-MM-DD' or null
  color: string;
  items: RoutineItemDTO[];
}

export interface RoutineResponseDTO {
  routineId: number;
  title: string;
  description?: string | null;
  cycleLength: number;
  startDate: string;
  endDate?: string | null;
  color: string;
  items: RoutineItemDTO[];
  isActive: boolean;
}

export interface RoutineOccurrenceDTO {
  routineId: number;
  routineItemId: number;
  title: string;
  description?: string | null;
  startDate: string; // 'YYYY-MM-DD'
  startTime: string | null; // 'HH:mm:ss' or 'HH:mm'
  endTime: string | null; // 'HH:mm:ss' or 'HH:mm'
  color: string | null;
  dayIndex: number;
  isRestDay: boolean;
}

export interface RoutineShiftRequestDTO {
  shiftDate: string; // 'YYYY-MM-DD'
  shiftDays: number;
  extendEndDate: boolean;
}

export interface RoutineOccurrencesRangeParams {
  fromDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
}

export interface RoutineActivateParams {
  activateDate?: string;
  newEndDate?: string | null;
}
