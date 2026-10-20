import type { ApiDateTime } from './api';

// ---- Enums (the backend sends them as uppercase strings) ----

export type SquadRole = 'OWNER' | 'ADMIN' | 'VIEWER';
export const SQUAD_ROLES: readonly SquadRole[] = ['OWNER', 'ADMIN', 'VIEWER'];

export type EventVisibility = 'PUBLIC' | 'BUSY' | 'MUTED';
export const EVENT_VISIBILITIES: readonly EventVisibility[] = ['PUBLIC', 'BUSY', 'MUTED'];
export const DEFAULT_VISIBILITY: EventVisibility = 'BUSY';

// ---- Responses ----

/** One item of GET /api/squad */
export interface SquadSummaryResponseDTO {
  squadId: number;
  squadName: string;
  squadDescription: string | null;
  role: SquadRole;
  myVisibility: EventVisibility;
}

/** One member inside GET /api/squad/{id}. Members do NOT expose their visibility. */
export interface SquadMemberResponseDTO {
  userId: number;
  username: string;
  role: SquadRole;
  joinedAt: ApiDateTime;
}

/** GET /api/squad/{id} */
export interface SquadDetailResponseDTO {
  squadId: number;
  squadName: string;
  squadDescription: string | null;
  inviteCode: string;
  myRole: SquadRole;
  myVisibility: EventVisibility;
  members: SquadMemberResponseDTO[];
}

/** Response of POST /api/squad and POST /api/squad/join */
export interface SquadResponseDTO {
  squadId: number;
  squadName: string;
  squadDescription: string | null;
  inviteCode: string;
}

/** One event inside the squad calendar. Note: the id is `taskId`, not `eventId`,
 *  and there is NO description. */
export interface SquadCalendarEventDTO {
  taskId: number;
  /** "BUSY" (any case) or null/empty means the member's details are hidden. */
  title: string | null;
  startTime: ApiDateTime;
  endTime: ApiDateTime;
  isFlexible: boolean;
}

/** One member block of GET /api/squad/{id}/calendar */
export interface SquadCalendarMemberDTO {
  userId: number;
  username: string;
  events: SquadCalendarEventDTO[];
}

// ---- Requests ----

/** POST /api/squad */
export interface SquadCreateRequestDTO {
  squadName: string;
  squadDescription?: string;
}

/** POST /api/squad/join */
export interface JoinSquadRequestDTO {
  inviteCode: string;
}

/** DELETE /api/squad/{id}/kick (sent as a JSON body on DELETE) */
export interface KickMemberRequestDTO {
  targetUserId: number;
}

/** PUT /api/squad/role */
export interface ChangeRoleRequestDTO {
  squadId: number;
  targetUserId: number;
  role: SquadRole;
}

/** PUT /api/squad/visibility (changes MY visibility in that squad) */
export interface ChangeVisibilityRequestDTO {
  squadId: number;
  visibility: EventVisibility;
}
