import { request } from './client';
import type { DateRangeParams } from '../types/api';
import type {
  ChangeRoleRequestDTO,
  ChangeVisibilityRequestDTO,
  JoinSquadRequestDTO,
  KickMemberRequestDTO,
  SquadCalendarMemberDTO,
  SquadCreateRequestDTO,
  SquadDetailResponseDTO,
  SquadResponseDTO,
  SquadSummaryResponseDTO,
} from '../types/squad';

export function getMySquads(signal?: AbortSignal): Promise<SquadSummaryResponseDTO[]> {
  return request<SquadSummaryResponseDTO[]>('/squad', { signal });
}

export function getSquad(squadId: number, signal?: AbortSignal): Promise<SquadDetailResponseDTO> {
  return request<SquadDetailResponseDTO>(`/squad/${squadId}`, { signal });
}

export function createSquad(body: SquadCreateRequestDTO): Promise<SquadResponseDTO> {
  return request<SquadResponseDTO>('/squad', { method: 'POST', body });
}

/** Any 2xx counts as success. The code is trimmed because people paste it with spaces. */
export function joinSquad(body: JoinSquadRequestDTO): Promise<SquadResponseDTO> {
  const trimmed: JoinSquadRequestDTO = { inviteCode: body.inviteCode.trim() };
  return request<SquadResponseDTO>('/squad/join', { method: 'POST', body: trimmed });
}

/** 204 No Content */
export function leaveSquad(squadId: number): Promise<void> {
  return request<void>(`/squad/${squadId}/leave`, { method: 'DELETE' });
}

/**
 * Remove a member. 204 No Content.
 * This is the ONLY place the kick call is made, so adding a `reason`
 * later only means extending `KickMemberRequestDTO` and this function.
 */
export function kickMember(squadId: number, targetUserId: number): Promise<void> {
  const body: KickMemberRequestDTO = { targetUserId };
  return request<void>(`/squad/${squadId}/kick`, { method: 'DELETE', body });
}

/** OWNER only. 204 No Content. */
export function deleteSquad(squadId: number): Promise<void> {
  return request<void>(`/squad/${squadId}`, { method: 'DELETE' });
}

/**
 * Change a member's role. Also used for ownership transfer (role: "OWNER").
 * 204 No Content: always refetch the squad afterwards and trust the server's
 * result (e.g. what happens to the old owner is decided by the server).
 */
export function changeRole(body: ChangeRoleRequestDTO): Promise<void> {
  return request<void>('/squad/role', { method: 'PUT', body });
}

/** Change MY visibility in a squad. 204 No Content. */
export function changeVisibility(body: ChangeVisibilityRequestDTO): Promise<void> {
  return request<void>('/squad/visibility', { method: 'PUT', body });
}

/**
 * Combined calendar of all members for a range.
 * Sends both `start`/`end` (from the brief) and `startTime`/`endTime` (used in
 * `SquadController.java`) so either backend signature works seamlessly.
 */
export function getSquadCalendar(
  squadId: number,
  range: DateRangeParams,
  signal?: AbortSignal,
): Promise<SquadCalendarMemberDTO[]> {
  return request<SquadCalendarMemberDTO[]>(`/squad/${squadId}/calendar`, {
    query: {
      start: range.start,
      end: range.end,
      startTime: range.start,
      endTime: range.end,
    },
    signal,
  });
}
